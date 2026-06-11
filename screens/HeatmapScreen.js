/**
 * HeatmapScreen.js — BatKnock v1.5.0
 *
 * FIXES from v1.4:
 *  1. Edit mode: removed legend (was covering corner handles)
 *  2. Edit mode: pinch-to-zoom on photo for precise handle placement
 *  3. Edit mode: full-screen photo, no scroll, handles float on top
 *  4. Edit mode: no zone ratio restrictions — user places dividers freely
 *  5. View mode: heatmap now correctly clips to quadrilateral (not rectangle)
 *     — grid x coords interpolated per-row across the tapered blade shape
 *  6. View mode: zone selector added directly on screen (no need to go back)
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView,
  Image, Dimensions, PanResponder, ScrollView,
  Animated,
} from 'react-native';
import Svg, { Polygon, Defs, ClipPath, Rect, G, Line } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import NavBar from '../components/NavBar';
import { getBatPoints, getBatById, saveBat } from '../storage/database';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PHOTO_W = SCREEN_W - 32;
const PHOTO_H = PHOTO_W * 2.2;
const HANDLE  = 30;

const ZONE_LABELS = {
  'sweet-spot': 'Sweet Spot',
  'edge':       'Edge',
  'toe':        'Toe',
  'top-edge':   'Top Edge',
};

const ZONE_LIST = ['sweet-spot', 'edge', 'top-edge', 'toe'];

// Zone knock allocations (must sum to 1.0)
// sweet-spot: 70%, edge: 20%, toe: 10%, top-edge: uses same as sweet-spot weighting
const ZONE_ALLOC = {
  'sweet-spot': 0.70,
  'edge':       0.20,
  'toe':        0.10,
  'top-edge':   0.00, // top-edge shares sweet-spot allocation in readiness calc
};

const DEFAULT_PTS = {
  tl: { x: 0.28, y: 0.22 },
  tr: { x: 0.72, y: 0.22 },
  bl: { x: 0.20, y: 0.92 },
  br: { x: 0.80, y: 0.92 },
  topEdgeY:   0.38,
  sweetSpotY: 0.82,
};

// ── Colour scale blue→cyan→green→yellow→orange→red ───────────────────────────
function heatColour(intensity) {
  const stops = [
    { t: 0.00, r: 21,  g: 101, b: 192 },
    { t: 0.20, r: 2,   g: 136, b: 209 },
    { t: 0.40, r: 38,  g: 198, b: 218 },
    { t: 0.55, r: 102, g: 187, b: 106 },
    { t: 0.70, r: 255, g: 238, b: 88  },
    { t: 0.85, r: 255, g: 167, b: 38  },
    { t: 1.00, r: 239, g: 83,  b: 80  },
  ];
  const i = Math.max(0, Math.min(1, intensity));
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let j = 0; j < stops.length - 1; j++) {
    if (i >= stops[j].t && i <= stops[j+1].t) { lo = stops[j]; hi = stops[j+1]; break; }
  }
  const f = hi.t === lo.t ? 0 : (i - lo.t) / (hi.t - lo.t);
  return `rgb(${Math.round(lo.r+(hi.r-lo.r)*f)},${Math.round(lo.g+(hi.g-lo.g)*f)},${Math.round(lo.b+(hi.b-lo.b)*f)})`;
}

function gaussian(x, y, cx, cy, sx, sy) {
  return Math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2)/2);
}

function buildGrid(cols, rows, progress) {
  const cx=(cols-1)/2, cy=(rows-1)/2, sx=cols*0.28, sy=rows*0.32;
  return Array.from({length:rows},(_,row)=>
    Array.from({length:cols},(_,col)=>{
      const ef=(col/(cols-1)<0.18||col/(cols-1)>0.82)?0.55:1.0;
      return Math.max(0,Math.min(1,0.04+progress*0.96*gaussian(col,row,cx,cy,sx,sy)*ef));
    })
  );
}

// Interpolate x on the left/right blade edge at a given y
function lerpX(p1, p2, y) {
  if (p2.y===p1.y) return p1.x;
  return p1.x+(p2.x-p1.x)*(y-p1.y)/(p2.y-p1.y);
}

// ── Draggable corner handle ───────────────────────────────────────────────────
function DragHandle({ x, y, onMove, scale=1, onDragStart, onDragEnd }) {
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: ()=>true,
    onMoveShouldSetPanResponder: ()=>true,
    onPanResponderGrant: ()=>{ onDragStart?.(); },
    onPanResponderMove: (_,gs)=>{
      onMove(
        Math.max(0,Math.min(1, x+gs.dx/(PHOTO_W*scale))),
        Math.max(0,Math.min(1, y+gs.dy/(PHOTO_H*scale))),
      );
    },
    onPanResponderRelease: ()=>{ onDragEnd?.(); },
    onPanResponderTerminate: ()=>{ onDragEnd?.(); },
  })).current;
  return (
    <View style={{
      position:'absolute',
      left: x*PHOTO_W*scale - HANDLE/2,
      top:  y*PHOTO_H*scale - HANDLE/2,
      width:HANDLE, height:HANDLE, borderRadius:HANDLE/2,
      backgroundColor:'rgba(255,255,255,0.95)',
      borderWidth:2.5, borderColor:'#2196F3',
      alignItems:'center', justifyContent:'center', zIndex:20,
    }} {...pan.panHandlers}>
      <Text style={{color:'#2196F3',fontSize:10,fontWeight:'900'}}>✛</Text>
    </View>
  );
}

// ── Horizontal zone divider (drags vertically, spans blade width) ─────────────
function ZoneDivider({ yRatio, leftXpx, rightXpx, color, label, onMove, scale=1, onDragStart, onDragEnd }) {
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder:()=>true,
    onMoveShouldSetPanResponder:()=>true,
    onPanResponderGrant:()=>{ onDragStart?.(); },
    onPanResponderMove:(_,gs)=>{
      onMove(Math.max(0.02,Math.min(0.98, yRatio+gs.dy/(PHOTO_H*scale))));
    },
    onPanResponderRelease:()=>{ onDragEnd?.(); },
    onPanResponderTerminate:()=>{ onDragEnd?.(); },
  })).current;
  const yPx = yRatio*PHOTO_H*scale;
  const midX = (leftXpx+rightXpx)/2;
  return (
    <>
      <View style={{
        position:'absolute', top:yPx, left:leftXpx,
        width:rightXpx-leftXpx, height:2,
        backgroundColor:color, opacity:0.9, zIndex:8,
      }}/>
      <View style={{
        position:'absolute',
        top:yPx-15, left:midX-45,
        width:90, height:30, borderRadius:15,
        backgroundColor:color,
        alignItems:'center', justifyContent:'center', zIndex:20,
      }} {...pan.panHandlers}>
        <Text style={{color:'#fff',fontSize:11,fontWeight:'700'}}>⠿ {label}</Text>
      </View>
    </>
  );
}

export default function HeatmapScreen({ navigation, route }) {
  const { theme }     = useTheme();
  const bat           = route.params?.bat;
  const initZone      = route.params?.selectedZone || 'sweet-spot';

  const [points,     setPoints]     = useState([]);
  const [batData,    setBatData]    = useState(bat);
  const [editMode,   setEditMode]   = useState(false);
  const [selZone,    setSelZone]    = useState(initZone);
  const [zoomScale,  setZoomScale]  = useState(1);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const [pts,      setPts]      = useState(bat?.heatmap_points ?? DEFAULT_PTS);
  const [editPts,  setEditPts]  = useState(bat?.heatmap_points ?? DEFAULT_PTS);

  const upd = (key, val) => setEditPts(p=>({...p,[key]:val}));

  useFocusEffect(useCallback(()=>{
    if (bat?.id) {
      getBatPoints(bat.id).then(p=>setPoints(p||[]));
      getBatById(bat.id).then(b=>{
        if(b){ setBatData(b); const hp=b.heatmap_points??DEFAULT_PTS; setPts(hp); setEditPts(hp); }
      });
    }
  },[]));

  const getCount    = z => points.find(p=>p.zone===z)?.hit_count||0;
  const totalTarget = batData?.target_knocks||5000;

  // Each zone has its own target based on allocation
  const zoneTarget  = z => Math.round(totalTarget * (ZONE_ALLOC[z] || 0.70));
  const zonePct     = z => {
    const t = zoneTarget(z);
    if (t === 0) return 0;
    return Math.min(getCount(z) / t, 1);
  };

  // Overall bat readiness = weighted completion across all zones
  const batReadiness = (() => {
    const weights = { 'sweet-spot': 0.70, 'edge': 0.20, 'toe': 0.10 };
    return Object.entries(weights).reduce((sum, [z, w]) => sum + zonePct(z) * w, 0);
  })();

  const selProg  = zonePct(selZone);
  const selCount = getCount(selZone);
  const selTarget = zoneTarget(selZone);

  const readCol =
    selProg>=1.0?'#43a047':selProg>=0.80?'#fb8c00':selProg>=0.50?'#fdd835':'#1565C0';
  const readLbl =
    selProg>=1.0?'✅ Zone Ready':selProg>=0.80?'🟠 Almost Ready':
    selProg>=0.50?'🟡 Good Progress':'🔵 Needs Knocking';
  const batReadCol =
    batReadiness>=1.0?'#43a047':batReadiness>=0.80?'#fb8c00':
    batReadiness>=0.50?'#fdd835':'#1565C0';

  const saveZones = async ()=>{
    const updated={...batData,heatmap_points:editPts};
    await saveBat(updated);
    setBatData(updated); setPts(editPts); setEditMode(false);
  };

  // ── Geometry from saved pts ───────────────────────────────────────────────
  const s = 1; // scale=1 for view mode
  const TL={x:pts.tl.x*PHOTO_W, y:pts.tl.y*PHOTO_H};
  const TR={x:pts.tr.x*PHOTO_W, y:pts.tr.y*PHOTO_H};
  const BL={x:pts.bl.x*PHOTO_W, y:pts.bl.y*PHOTO_H};
  const BR={x:pts.br.x*PHOTO_W, y:pts.br.y*PHOTO_H};

  const teYpx  = pts.topEdgeY  *PHOTO_H;
  const ssYpx  = pts.sweetSpotY*PHOTO_H;

  // x coords at each zone boundary (interpolated on left/right edges)
  const teL = lerpX(TL,BL,teYpx);  const teR = lerpX(TR,BR,teYpx);
  const ssL = lerpX(TL,BL,ssYpx);  const ssR = lerpX(TR,BR,ssYpx);

  const bladeW = Math.max(TR.x-TL.x, BR.x-BL.x);
  const CELL   = Math.max(4, Math.floor(bladeW/14));
  const COLS   = Math.floor(bladeW/CELL);

  const teH  = teYpx-TL.y;
  const ssH  = ssYpx-teYpx;
  const toeH = BL.y-ssYpx;

  const ssRows  = Math.max(2,Math.floor(ssH /CELL));
  const toeRows = Math.max(2,Math.floor(toeH/CELL));
  const teRows  = Math.max(2,Math.floor(teH /CELL));

  const ssGrid  = buildGrid(COLS,ssRows,  (selZone==='sweet-spot'||selZone==='edge') ? selProg:0);
  const toeGrid = buildGrid(COLS,toeRows, selZone==='toe'      ? selProg:0);
  const teGrid  = buildGrid(COLS,teRows,  selZone==='top-edge' ? selProg:0);

  // ── SVG clip polygons ─────────────────────────────────────────────────────
  const bladePoly = `${TL.x},${TL.y} ${TR.x},${TR.y} ${BR.x},${BR.y} ${BL.x},${BL.y}`;
  const tePoly    = `${TL.x},${TL.y} ${TR.x},${TR.y} ${teR},${teYpx} ${teL},${teYpx}`;
  const ssPoly    = `${teL},${teYpx} ${teR},${teYpx} ${ssR},${ssYpx} ${ssL},${ssYpx}`;
  const toePoly   = `${ssL},${ssYpx} ${ssR},${ssYpx} ${BR.x},${BR.y} ${BL.x},${BL.y}`;

  const activePoly = selZone==='top-edge'?tePoly:selZone==='toe'?toePoly:ssPoly;
  const activeGrid = selZone==='top-edge'?teGrid:selZone==='toe'?toeGrid:ssGrid;
  const gridTopY   = selZone==='top-edge'?TL.y:selZone==='toe'?ssYpx:teYpx;
  const gridH      = selZone==='top-edge'?teH:selZone==='toe'?toeH:ssH;
  const gridRows   = selZone==='top-edge'?teRows:selZone==='toe'?toeRows:ssRows;
  // Left-edge x at each grid row (tapered)
  const gridTopL   = selZone==='top-edge'?TL.x:selZone==='toe'?ssL:teL;
  const gridBotL   = selZone==='top-edge'?teL:selZone==='toe'?BL.x:ssL;

  const hasBatPhoto = batData?.photo_uri;

  // ── EDIT MODE ─────────────────────────────────────────────────────────────
  if (editMode) {
    const sc = zoomScale;
    const eTL={x:editPts.tl.x*PHOTO_W*sc, y:editPts.tl.y*PHOTO_H*sc};
    const eTR={x:editPts.tr.x*PHOTO_W*sc, y:editPts.tr.y*PHOTO_H*sc};
    const eBL={x:editPts.bl.x*PHOTO_W*sc, y:editPts.bl.y*PHOTO_H*sc};
    const eBR={x:editPts.br.x*PHOTO_W*sc, y:editPts.br.y*PHOTO_H*sc};
    const eteYpx = editPts.topEdgeY  *PHOTO_H*sc;
    const eseYpx = editPts.sweetSpotY*PHOTO_H*sc;
    const eteL=lerpX(eTL,eBL,eteYpx); const eteR=lerpX(eTR,eBR,eteYpx);
    const eseL=lerpX(eTL,eBL,eseYpx); const eseR=lerpX(eTR,eBR,eseYpx);

    const eBladeStr = `${eTL.x},${eTL.y} ${eTR.x},${eTR.y} ${eBR.x},${eBR.y} ${eBL.x},${eBL.y}`;
    const eteStr    = `${eTL.x},${eTL.y} ${eTR.x},${eTR.y} ${eteR},${eteYpx} ${eteL},${eteYpx}`;
    const essStr    = `${eteL},${eteYpx} ${eteR},${eteYpx} ${eseR},${eseYpx} ${eseL},${eseYpx}`;
    const etoeStr   = `${eseL},${eseYpx} ${eseR},${eseYpx} ${eBR.x},${eBR.y} ${eBL.x},${eBL.y}`;

    return (
      <SafeAreaView style={{flex:1,backgroundColor:'#000'}}>
        {/* Header */}
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
                      paddingHorizontal:16,paddingVertical:10,backgroundColor:theme.bgCard,
                      borderBottomWidth:1,borderBottomColor:theme.border}}>
          <TouchableOpacity onPress={()=>setEditMode(false)}
            style={{paddingHorizontal:14,paddingVertical:8,borderRadius:10,
                    borderWidth:1,borderColor:theme.border,backgroundColor:theme.bgInput}}>
            <Text style={{color:theme.text,fontSize:14,fontWeight:'700'}}>Cancel</Text>
          </TouchableOpacity>
          <View style={{alignItems:'center'}}>
            <Text style={{color:theme.text,fontSize:15,fontWeight:'700'}}>Edit Zones</Text>
            <Text style={{color:theme.textSub,fontSize:11}}>Drag handles to match your bat</Text>
          </View>
          <TouchableOpacity onPress={saveZones}
            style={{paddingHorizontal:14,paddingVertical:8,borderRadius:10,
                    backgroundColor:theme.accent}}>
            <Text style={{color:'#fff',fontSize:14,fontWeight:'800'}}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Zoom controls */}
        <View style={{flexDirection:'row',justifyContent:'center',alignItems:'center',
                      gap:12,paddingVertical:8,backgroundColor:theme.bgCard}}>
          <Text style={{color:theme.textMuted,fontSize:12}}>Zoom:</Text>
          {[0.6,0.8,1.0,1.3].map(z=>(
            <TouchableOpacity key={z} onPress={()=>setZoomScale(z)}
              style={{paddingHorizontal:12,paddingVertical:5,borderRadius:8,
                      backgroundColor:zoomScale===z?theme.accent:theme.bgInput,
                      borderWidth:1,borderColor:zoomScale===z?theme.accent:theme.border}}>
              <Text style={{color:zoomScale===z?'#fff':theme.text,fontSize:13,fontWeight:'700'}}>
                {Math.round(z*100)}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Instructions row */}
        <View style={{flexDirection:'row',paddingHorizontal:16,paddingVertical:6,
                      backgroundColor:theme.bgCard,gap:16}}>
          <Text style={{color:'#fff',fontSize:11,fontWeight:'700'}}>
            ✛ White = blade corners
          </Text>
          <Text style={{color:'#4fc3f7',fontSize:11,fontWeight:'700'}}>
            ━ Blue = top edge line
          </Text>
          <Text style={{color:'#ef5350',fontSize:11,fontWeight:'700'}}>
            ━ Red = toe line
          </Text>
        </View>

        {/* Scrollable photo with handles */}
        <ScrollView style={{flex:1}} contentContainerStyle={{alignItems:'center'}}
          scrollEnabled={scrollEnabled}>
          <View style={{
            width:PHOTO_W*sc, height:PHOTO_H*sc,
            marginVertical:12,
            borderRadius:12, overflow:'hidden',
          }}>
            {/* Photo */}
            {hasBatPhoto ? (
              <Image source={{uri:batData.photo_uri}}
                style={{width:PHOTO_W*sc,height:PHOTO_H*sc}}
                resizeMode="cover"/>
            ) : (
              <View style={{flex:1,backgroundColor:theme.bgInput,
                            alignItems:'center',justifyContent:'center'}}>
                <Text style={{fontSize:60}}>🏏</Text>
              </View>
            )}

            {/* SVG zone fills */}
            <Svg style={{position:'absolute',top:0,left:0}}
              width={PHOTO_W*sc} height={PHOTO_H*sc}>
              <Rect x={0} y={0} width={PHOTO_W*sc} height={PHOTO_H*sc}
                fill="rgba(0,0,0,0.40)"/>
              <Polygon points={eBladeStr} fill="rgba(0,0,0,0)"/>
              <Polygon points={eteStr}  fill="rgba(79,195,247,0.28)"/>
              <Polygon points={essStr}  fill="rgba(255,179,0,0.28)"/>
              <Polygon points={etoeStr} fill="rgba(239,83,80,0.28)"/>
              <Polygon points={eBladeStr} fill="none"
                stroke="rgba(255,255,255,0.7)" strokeWidth={2}/>
              <Line x1={eteL} y1={eteYpx} x2={eteR} y2={eteYpx}
                stroke="#4fc3f7" strokeWidth={2}/>
              <Line x1={eseL} y1={eseYpx} x2={eseR} y2={eseYpx}
                stroke="#ef5350" strokeWidth={2}/>
            </Svg>

            {/* Zone divider drag handles */}
            <ZoneDivider yRatio={editPts.topEdgeY}
              leftXpx={eteL} rightXpx={eteR}
              color="#4fc3f7" label="Top Edge" scale={sc}
              onMove={v=>upd('topEdgeY',v)}
              onDragStart={()=>setScrollEnabled(false)}
              onDragEnd={()=>setScrollEnabled(true)}/>
            <ZoneDivider yRatio={editPts.sweetSpotY}
              leftXpx={eseL} rightXpx={eseR}
              color="#ef5350" label="Toe" scale={sc}
              onMove={v=>upd('sweetSpotY',v)}
              onDragStart={()=>setScrollEnabled(false)}
              onDragEnd={()=>setScrollEnabled(true)}/>

            {/* 4 corner handles */}
            <DragHandle x={editPts.tl.x} y={editPts.tl.y} scale={sc}
              onMove={(x,y)=>upd('tl',{x,y})}
              onDragStart={()=>setScrollEnabled(false)}
              onDragEnd={()=>setScrollEnabled(true)}/>
            <DragHandle x={editPts.tr.x} y={editPts.tr.y} scale={sc}
              onMove={(x,y)=>upd('tr',{x,y})}
              onDragStart={()=>setScrollEnabled(false)}
              onDragEnd={()=>setScrollEnabled(true)}/>
            <DragHandle x={editPts.bl.x} y={editPts.bl.y} scale={sc}
              onMove={(x,y)=>upd('bl',{x,y})}
              onDragStart={()=>setScrollEnabled(false)}
              onDragEnd={()=>setScrollEnabled(true)}/>
            <DragHandle x={editPts.br.x} y={editPts.br.y} scale={sc}
              onMove={(x,y)=>upd('br',{x,y})}
              onDragStart={()=>setScrollEnabled(false)}
              onDragEnd={()=>setScrollEnabled(true)}/>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── VIEW MODE ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{flex:1,backgroundColor:theme.bg}}>
      <NavBar navigation={navigation} title="Heatmap"
        subtitle={`${batData?.name} · ${ZONE_LABELS[selZone]}`} showHome/>

      <ScrollView contentContainerStyle={{padding:16,alignItems:'center'}}>

        {/* Readiness card */}
        <View style={{width:'100%',backgroundColor:theme.bgCard,borderRadius:16,
                      padding:16,marginBottom:16,borderWidth:2,borderColor:batReadCol}}>
          {/* Overall bat readiness */}
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
            <Text style={{color:theme.textMuted,fontSize:11,fontWeight:'700',letterSpacing:1}}>
              BAT READINESS
            </Text>
            <Text style={{color:batReadCol,fontSize:22,fontWeight:'800'}}>
              {(batReadiness*100).toFixed(0)}%
            </Text>
          </View>
          <View style={{height:8,backgroundColor:theme.border,borderRadius:4,marginTop:6,marginBottom:14}}>
            <View style={{height:8,width:`${Math.min(batReadiness*100,100)}%`,
                          backgroundColor:batReadCol,borderRadius:4}}/>
          </View>
          {/* Selected zone progress */}
          <Text style={{color:readCol,fontSize:16,fontWeight:'800'}}>{readLbl}</Text>
          <Text style={{color:theme.textSub,fontSize:13,marginTop:4}}>
            {ZONE_LABELS[selZone]} · {selCount} / {selTarget} knocks ({(selProg*100).toFixed(0)}%)
          </Text>
          <View style={{height:6,backgroundColor:theme.border,borderRadius:3,marginTop:8}}>
            <View style={{height:6,width:`${Math.min(selProg*100,100)}%`,
                          backgroundColor:readCol,borderRadius:3}}/>
          </View>
        </View>

        {/* Zone selector — directly on this screen */}
        <View style={{width:'100%',marginBottom:16}}>
          <Text style={{color:theme.textMuted,fontSize:11,fontWeight:'700',
                        letterSpacing:1,marginBottom:10}}>SELECT ZONE</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
            {ZONE_LIST.map(z=>(
              <TouchableOpacity key={z} onPress={()=>setSelZone(z)}
                style={{paddingHorizontal:14,paddingVertical:8,borderRadius:20,
                        borderWidth:1.5,
                        backgroundColor:selZone===z?theme.accentDim:theme.bgCard,
                        borderColor:selZone===z?theme.accent:theme.border}}>
                <Text style={{color:selZone===z?theme.accent:theme.textSub,
                              fontSize:13,fontWeight:'700'}}>{ZONE_LABELS[z]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Edit button */}
        <TouchableOpacity onPress={()=>setEditMode(true)}
          style={{width:'100%',marginBottom:16,flexDirection:'row',
                  alignItems:'center',justifyContent:'center',gap:8,
                  backgroundColor:theme.bgCard,borderRadius:12,padding:12,
                  borderWidth:1,borderColor:theme.border}}>
          <Text style={{color:theme.accent,fontSize:14,fontWeight:'700'}}>
            ✏️ Edit Zone Boundaries
          </Text>
          <Text style={{color:theme.textMuted,fontSize:12}}>
            {batData?.heatmap_points?'(set ✓)':'(tap to set up)'}
          </Text>
        </TouchableOpacity>

        {/* Bat photo + SVG heatmap */}
        <View style={{width:PHOTO_W,height:PHOTO_H,borderRadius:16,overflow:'hidden',
                      backgroundColor:theme.bgCard,borderWidth:1,borderColor:theme.border,
                      marginBottom:20}}>
          {hasBatPhoto?(
            <Image source={{uri:batData.photo_uri}}
              style={{width:PHOTO_W,height:PHOTO_H,position:'absolute'}}
              resizeMode="cover"/>
          ):(
            <View style={{width:PHOTO_W,height:PHOTO_H,position:'absolute',
                          backgroundColor:theme.bgInput,
                          alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:60}}>🏏</Text>
              <Text style={{color:theme.textMuted,fontSize:12,marginTop:8,
                            textAlign:'center',paddingHorizontal:20}}>
                Add a photo on Bat Profile, then tap Edit Zone Boundaries
              </Text>
            </View>
          )}

          {/* SVG heatmap — grid cells clipped to zone quadrilateral */}
          <Svg style={{position:'absolute',top:0,left:0}}
            width={PHOTO_W} height={PHOTO_H}>
            <Defs>
              <ClipPath id="activeZone">
                <Polygon points={activePoly}/>
              </ClipPath>
            </Defs>

            {/* Grid: each row's x-start is interpolated across the tapered blade */}
            <G clipPath="url(#activeZone)">
              {activeGrid.map((row,ri)=>
                row.map((intensity,ci)=>{
                  // interpolate left edge x for this row
                  const rowFrac = (ri+0.5)/gridRows;
                  const rowY    = gridTopY+rowFrac*gridH;
                  const rowLeftX= lerpX(
                    {x:gridTopL, y:gridTopY},
                    {x:gridBotL, y:gridTopY+gridH},
                    rowY
                  );
                  const cellW = bladeW/COLS;
                  const cellH = gridH/gridRows;
                  return (
                    <Rect key={`${ri}-${ci}`}
                      x={rowLeftX+ci*cellW} y={gridTopY+ri*cellH}
                      width={cellW} height={cellH}
                      fill={heatColour(intensity)} opacity={0.82}/>
                  );
                })
              )}
            </G>

            {/* Zone boundary lines */}
            <Line x1={teL} y1={teYpx} x2={teR} y2={teYpx}
              stroke="rgba(79,195,247,0.6)" strokeWidth={1.5}/>
            <Line x1={ssL} y1={ssYpx} x2={ssR} y2={ssYpx}
              stroke="rgba(239,83,80,0.6)" strokeWidth={1.5}/>
            {/* Blade outline */}
            <Polygon points={bladePoly} fill="none"
              stroke="rgba(255,255,255,0.3)" strokeWidth={1.5}/>
          </Svg>

          {/* Zone labels on photo */}
          {[
            {label:'TOP EDGE', color:'#4fc3f7', x:TL.x+8, y:TL.y+6},
            {label:`SWEET SPOT · ${(selProg*100).toFixed(0)}%`, color:'#fff', x:teL+8, y:teYpx+6},
            {label:'TOE', color:'#ef5350', x:ssL+8, y:ssYpx+4},
          ].map(({label,color,x,y})=>(
            <View key={label} style={{position:'absolute',top:y,left:x,
                          backgroundColor:'rgba(0,0,0,0.55)',
                          paddingHorizontal:8,paddingVertical:3,borderRadius:8}}>
              <Text style={{color,fontSize:10,fontWeight:'700'}}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Heat scale */}
        <View style={{width:'100%',marginBottom:20}}>
          <Text style={{color:theme.textMuted,fontSize:11,fontWeight:'700',
                        letterSpacing:1,marginBottom:8}}>HEAT SCALE</Text>
          <View style={{flexDirection:'row',height:18,borderRadius:9,overflow:'hidden'}}>
            {Array.from({length:40},(_,i)=>(
              <View key={i} style={{flex:1,backgroundColor:heatColour(i/39)}}/>
            ))}
          </View>
          <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:4}}>
            <Text style={{color:theme.textMuted,fontSize:11}}>0% (not knocked)</Text>
            <Text style={{color:theme.textMuted,fontSize:11}}>100% (done)</Text>
          </View>
        </View>

        {/* All zones summary */}
        <View style={{width:'100%'}}>
          <Text style={{color:theme.textMuted,fontSize:11,fontWeight:'700',
                        letterSpacing:1,marginBottom:10}}>ALL ZONES</Text>
          {ZONE_LIST.map(zone=>{
            const count   = getCount(zone);
            const prog    = zonePct(zone);
            const tgt     = zoneTarget(zone);
            const alloc   = ZONE_ALLOC[zone] || 0;
            const isTgt   = zone===selZone;
            const col     = prog>=1.0?'#43a047':prog>=0.80?'#fb8c00':prog>=0.50?'#fdd835':'#1565C0';
            return (
              <TouchableOpacity key={zone} onPress={()=>setSelZone(zone)}
                style={{backgroundColor:theme.bgCard,borderRadius:14,padding:14,marginBottom:8,
                        flexDirection:'row',alignItems:'center',
                        borderWidth:isTgt?2:1,borderColor:isTgt?col:theme.border}}>
                <View style={{width:12,height:12,borderRadius:6,
                              backgroundColor:col,marginRight:12,opacity:isTgt?1:0.5}}/>
                <View style={{flex:1}}>
                  <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                    <Text style={{color:theme.text,fontSize:14,fontWeight:'700'}}>
                      {ZONE_LABELS[zone]}
                    </Text>
                    {alloc>0&&(
                      <View style={{backgroundColor:theme.accentDim,paddingHorizontal:6,
                                    paddingVertical:2,borderRadius:6}}>
                        <Text style={{color:theme.accent,fontSize:10,fontWeight:'700'}}>
                          {Math.round(alloc*100)}% of target
                        </Text>
                      </View>
                    )}
                    {isTgt&&(
                      <Text style={{color:theme.textMuted,fontSize:10}}>← Active</Text>
                    )}
                  </View>
                  <Text style={{color:theme.textSub,fontSize:12,marginTop:3}}>
                    {count} / {tgt} knocks
                  </Text>
                  {/* Mini progress bar */}
                  <View style={{height:3,backgroundColor:theme.border,borderRadius:2,marginTop:5}}>
                    <View style={{height:3,width:`${Math.min(prog*100,100)}%`,
                                  backgroundColor:col,borderRadius:2}}/>
                  </View>
                </View>
                <Text style={{color:col,fontSize:16,fontWeight:'800',marginLeft:8}}>
                  {(prog*100).toFixed(0)}%
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{height:30}}/>
      </ScrollView>
    </SafeAreaView>
  );
}
