/**
 * Second Life LSL compile checker.
 * Catches the error classes the older brace/event-count pass missed, and can
 * run on a stable prefix while a script is still streaming.
 */

export interface LslDiagnostic {
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface LslLintResult {
  errors: LslDiagnostic[];
  warnings: LslDiagnostic[];
}

export const LSL_TYPES = ['integer', 'float', 'string', 'key', 'vector', 'rotation', 'list'] as const;

/** Canonical event parameter types (order matters). */
export const LSL_EVENT_PARAMS: Record<string, string[]> = {
  state_entry: [],
  state_exit: [],
  touch_start: ['integer'],
  touch: ['integer'],
  touch_end: ['integer'],
  listen: ['integer', 'string', 'key', 'string'],
  timer: [],
  sensor: ['integer'],
  no_sensor: [],
  on_rez: ['integer'],
  changed: ['integer'],
  attach: ['key'],
  control: ['key', 'integer', 'integer'],
  run_time_permissions: ['integer'],
  dataserver: ['key', 'string'],
  http_response: ['key', 'integer', 'list', 'string'],
  http_request: ['key', 'string', 'string'],
  money: ['key', 'integer'],
  collision_start: ['integer'],
  collision: ['integer'],
  collision_end: ['integer'],
  land_collision_start: ['vector'],
  land_collision: ['vector'],
  land_collision_end: ['vector'],
  link_message: ['integer', 'integer', 'string', 'key'],
  object_rez: ['key'],
  transaction_result: ['key', 'integer', 'string'],
  path_update: ['integer', 'list'],
  experience_permissions: ['key'],
  experience_permissions_denied: ['key', 'integer'],
  at_target: ['integer', 'vector', 'vector'],
  not_at_target: [],
  at_rot_target: ['integer', 'rotation', 'rotation'],
  not_at_rot_target: [],
  email: ['string', 'string', 'string', 'string', 'integer'],
  moving_start: [],
  moving_end: [],
};

const NON_LSL = new Set([
  'switch',
  'break',
  'continue',
  'class',
  'const',
  'var',
  'let',
  'function',
  'print',
  'elif',
]);

const CONST_TYPES: Record<string, string> = {
  TRUE: 'integer',
  FALSE: 'integer',
  NULL_KEY: 'key',
  ZERO_VECTOR: 'vector',
  ZERO_ROTATION: 'rotation',
  PI: 'float',
  TWO_PI: 'float',
  PI_BY_TWO: 'float',
  DEG_TO_RAD: 'float',
  RAD_TO_DEG: 'float',
  SQRT2: 'float',
};

/** name -> [argument count, return type] ('' means void). */
const LL_SPEC: Record<string, [number, string]> = {};

function ll(name: string, args: number, ret = '') {
  LL_SPEC[name] = [args, ret];
}

// Communication
ll('llSay', 2);
ll('llWhisper', 2);
ll('llShout', 2);
ll('llOwnerSay', 1);
ll('llInstantMessage', 2);
ll('llRegionSay', 2);
ll('llRegionSayTo', 3);
ll('llListen', 4, 'integer');
ll('llListenControl', 2);
ll('llListenRemove', 1);
ll('llDialog', 4);
ll('llTextBox', 3);
ll('llMessageLinked', 4);
ll('llLoadURL', 3);

// Agent / owner / names
ll('llGetOwner', 0, 'key');
ll('llGetKey', 0, 'key');
ll('llGetCreator', 0, 'key');
ll('llKey2Name', 1, 'string');
ll('llGetUsername', 1, 'string');
ll('llRequestUsername', 1, 'key');
ll('llGetDisplayName', 1, 'string');
ll('llRequestDisplayName', 1, 'key');
ll('llGetOwnerKey', 1, 'key');
ll('llSameGroup', 1, 'integer');
ll('llGetAgentSize', 1, 'vector');
ll('llGetAgentInfo', 1, 'integer');
ll('llGetAgentLanguage', 1, 'string');
ll('llGetAgentList', 2, 'list');
ll('llRequestAgentData', 2, 'key');
ll('llTeleportAgent', 4);
ll('llTeleportAgentGlobalCoords', 4);
ll('llEjectFromLand', 1);
ll('llAddToLandPassList', 2);
ll('llRemoveFromLandPassList', 1);
ll('llAddToLandBanList', 2);
ll('llRemoveFromLandBanList', 1);
ll('llResetLandPassList', 0);
ll('llResetLandBanList', 0);
ll('llOverMyLand', 1, 'integer');
ll('llManageEstateAccess', 2, 'integer');
ll('llReturnObjectsByID', 1, 'integer');
ll('llReturnObjectsByOwner', 2, 'integer');

// Detected
ll('llDetectedKey', 1, 'key');
ll('llDetectedName', 1, 'string');
ll('llDetectedOwner', 1, 'key');
ll('llDetectedGroup', 1, 'integer');
ll('llDetectedLinkNumber', 1, 'integer');
ll('llDetectedType', 1, 'integer');
ll('llDetectedPos', 1, 'vector');
ll('llDetectedVel', 1, 'vector');
ll('llDetectedRot', 1, 'rotation');
ll('llDetectedGrab', 1, 'vector');
ll('llDetectedTouchFace', 1, 'integer');
ll('llDetectedTouchUV', 1, 'vector');
ll('llDetectedTouchST', 1, 'vector');
ll('llDetectedTouchNormal', 1, 'vector');
ll('llDetectedTouchBinormal', 1, 'vector');

// Sensors / timers / time
ll('llSensor', 5);
ll('llSensorRepeat', 6);
ll('llSensorRemove', 0);
ll('llSetTimerEvent', 1);
ll('llSleep', 1);
ll('llGetTime', 0, 'float');
ll('llResetTime', 0);
ll('llGetAndResetTime', 0, 'float');
ll('llGetTimestamp', 0, 'string');
ll('llGetUnixTime', 0, 'integer');
ll('llGetDate', 0, 'string');
ll('llGetGMTclock', 0, 'float');
ll('llGetWallclock', 0, 'float');
ll('llGetRegionTimeDilation', 0, 'float');
ll('llGetRegionFPS', 0, 'float');
ll('llFrand', 1, 'float');
ll('llMinEventDelay', 1);

// Movement / physics
ll('llGetPos', 0, 'vector');
ll('llSetPos', 1);
ll('llGetRot', 0, 'rotation');
ll('llSetRot', 1);
ll('llGetLocalPos', 0, 'vector');
ll('llGetLocalRot', 0, 'rotation');
ll('llGetScale', 0, 'vector');
ll('llSetScale', 1);
ll('llSetRegionPos', 1, 'integer');
ll('llGetVel', 0, 'vector');
ll('llGetAccel', 0, 'vector');
ll('llGetOmega', 0, 'vector');
ll('llGetForce', 0, 'vector');
ll('llGetTorque', 0, 'vector');
ll('llApplyImpulse', 2);
ll('llApplyRotationalImpulse', 2);
ll('llSetForce', 2);
ll('llSetTorque', 2);
ll('llSetBuoyancy', 1);
ll('llSetHoverHeight', 3);
ll('llStopHover', 0);
ll('llLookAt', 3);
ll('llStopLookAt', 0);
ll('llRotLookAt', 3);
ll('llTarget', 2, 'integer');
ll('llTargetRemove', 1);
ll('llRotTarget', 2, 'integer');
ll('llRotTargetRemove', 1);
ll('llMoveToTarget', 2);
ll('llStopMoveToTarget', 0);
ll('llTargetOmega', 3);
ll('llGroundRepel', 3);
ll('llSetStatus', 2);
ll('llGetStatus', 1, 'integer');
ll('llGetMass', 0, 'float');
ll('llGetMassMKS', 0, 'float');
ll('llGetObjectMass', 1, 'float');
ll('llGetEnergy', 0, 'float');
ll('llGetBoundingBox', 1, 'list');
ll('llGetGeometricCenter', 0, 'vector');
ll('llGetCenterOfMass', 0, 'vector');
ll('llGround', 1, 'float');
ll('llWind', 1, 'vector');
ll('llWater', 1, 'float');
ll('llCloud', 1, 'float');
ll('llGetSunDirection', 0, 'vector');
ll('llGetMoonDirection', 0, 'vector');
ll('llCastRay', 3, 'list');
ll('llVolumeDetect', 1);
ll('llCollisionFilter', 3);
ll('llCollisionSound', 2);
ll('llPassCollisions', 1);
ll('llPassTouches', 1);
ll('llSetDamage', 1);

// Sit / attach
ll('llSitTarget', 2);
ll('llLinkSitTarget', 3);
ll('llAvatarOnSitTarget', 0, 'key');
ll('llAvatarOnLinkSitTarget', 1, 'key');
ll('llUnSit', 1);
ll('llSetClickAction', 1);
ll('llSetTouchText', 1);
ll('llSetSitText', 1);
ll('llAttachToAvatar', 1);
ll('llDetachFromAvatar', 0);
ll('llGetAttached', 0, 'integer');
ll('llStartAnimation', 1);
ll('llStopAnimation', 1);
ll('llGetAnimation', 1, 'string');
ll('llGetAnimationList', 1, 'list');
ll('llSetAnimationOverride', 2);
ll('llGetAnimationOverride', 1, 'string');
ll('llResetAnimationOverride', 1);

// Vehicles / controls
ll('llSetVehicleType', 1);
ll('llSetVehicleFloatParam', 2);
ll('llSetVehicleVectorParam', 2);
ll('llSetVehicleRotationParam', 2);
ll('llSetVehicleFlags', 1);
ll('llRemoveVehicleFlags', 1);
ll('llRequestPermissions', 2);
ll('llGetPermissions', 0, 'integer');
ll('llGetPermissionsKey', 0, 'key');
ll('llTakeControls', 3);
ll('llReleaseControls', 0);

// Prims / particles / text
ll('llSetText', 3);
ll('llSetAlpha', 2);
ll('llGetAlpha', 1, 'float');
ll('llSetColor', 2);
ll('llGetColor', 1, 'vector');
ll('llSetTexture', 2);
ll('llGetTexture', 1, 'string');
ll('llScaleTexture', 3);
ll('llOffsetTexture', 3);
ll('llRotateTexture', 2);
ll('llSetLinkAlpha', 3);
ll('llSetLinkColor', 3);
ll('llSetLinkTexture', 3);
ll('llSetTextureAnim', 7);
ll('llSetLinkTextureAnim', 8);
ll('llSetPrimitiveParams', 1);
ll('llGetPrimitiveParams', 1, 'list');
ll('llSetLinkPrimitiveParams', 2);
ll('llSetLinkPrimitiveParamsFast', 2);
ll('llGetLinkPrimitiveParams', 2, 'list');
ll('llParticleSystem', 1);
ll('llLinkParticleSystem', 2);
ll('llGetNumberOfSides', 0, 'integer');
ll('llSetPrimMediaParams', 2, 'integer');
ll('llGetPrimMediaParams', 2, 'list');
ll('llClearPrimMedia', 1, 'integer');
ll('llSetLinkMedia', 3, 'integer');
ll('llGetLinkMedia', 3, 'list');
ll('llClearLinkMedia', 2, 'integer');

// Linkset
ll('llGetLinkNumber', 0, 'integer');
ll('llGetNumberOfPrims', 0, 'integer');
ll('llGetLinkKey', 1, 'key');
ll('llGetLinkName', 1, 'string');
ll('llBreakLink', 1);
ll('llBreakAllLinks', 0);
ll('llCreateLink', 2);
ll('llLinksetDataWrite', 2, 'integer');
ll('llLinksetDataRead', 1, 'string');
ll('llLinksetDataDelete', 1, 'integer');
ll('llLinksetDataReset', 0);
ll('llLinksetDataCountKeys', 0, 'integer');
ll('llLinksetDataListKeys', 2, 'list');

// Inventory / notecards / rez
ll('llGetInventoryNumber', 1, 'integer');
ll('llGetInventoryName', 2, 'string');
ll('llGetInventoryType', 1, 'integer');
ll('llGetInventoryKey', 1, 'key');
ll('llGetInventoryCreator', 1, 'key');
ll('llGetInventoryPermMask', 2, 'integer');
ll('llRequestInventoryData', 1, 'key');
ll('llRemoveInventory', 1);
ll('llGiveInventory', 2);
ll('llGiveInventoryList', 3);
ll('llAllowInventoryDrop', 1);
ll('llGetNotecardLine', 2, 'key');
ll('llGetNumberOfNotecardLines', 1, 'key');
ll('llGetNotecardLineSync', 2, 'string');
ll('llGetNumberOfNotecardLinesSync', 1, 'integer');
ll('llRezObject', 5);
ll('llRezAtRoot', 5);
ll('llGetScriptName', 0, 'string');
ll('llGetScriptState', 1, 'integer');
ll('llSetScriptState', 2);
ll('llResetOtherScript', 1);
ll('llResetScript', 0);
ll('llGetStartParameter', 0, 'integer');
ll('llRemoteLoadScriptPin', 5);
ll('llDie', 0);

// Objects / region
ll('llGetObjectName', 0, 'string');
ll('llSetObjectName', 1);
ll('llGetObjectDesc', 0, 'string');
ll('llSetObjectDesc', 1);
ll('llGetRegionName', 0, 'string');
ll('llGetRegionCorner', 0, 'vector');
ll('llGetSimulatorHostname', 0, 'string');
ll('llEdgeOfWorld', 2, 'integer');
ll('llGetParcelFlags', 1, 'integer');
ll('llGetParcelDetails', 2, 'list');
ll('llGetLandOwnerAt', 1, 'key');
ll('llSetParcelMusicURL', 1);
ll('llGetParcelMaxPrims', 2, 'integer');
ll('llGetParcelPrimCount', 3, 'integer');
ll('llGetParcelPrimOwners', 1, 'list');
ll('llParcelMediaCommandList', 1);
ll('llParcelMediaQuery', 1, 'list');
ll('llGetObjectPermMask', 1, 'integer');
ll('llRequestSimulatorData', 2, 'key');
ll('llGetEnv', 1, 'string');

// Strings / lists / json
ll('llStringLength', 1, 'integer');
ll('llGetSubString', 3, 'string');
ll('llDeleteSubString', 3, 'string');
ll('llInsertString', 3, 'string');
ll('llSubStringIndex', 2, 'integer');
ll('llToLower', 1, 'string');
ll('llToUpper', 1, 'string');
ll('llStringTrim', 2, 'string');
ll('llEscapeURL', 1, 'string');
ll('llUnescapeURL', 1, 'string');
ll('llStringToBase64', 1, 'string');
ll('llBase64ToString', 1, 'string');
ll('llBase64ToInteger', 1, 'integer');
ll('llXorBase64', 2, 'string');
ll('llXorBase64StringsCorrect', 2, 'string');
ll('llMD5String', 2, 'string');
ll('llSHA1String', 1, 'string');
ll('llChar', 1, 'string');
ll('llOrd', 2, 'integer');
ll('llHash', 1, 'integer');
ll('llReplaceSubString', 4, 'string');
ll('llDumpList2String', 2, 'string');
ll('llParseString2List', 3, 'list');
ll('llParseStringKeepNulls', 3, 'list');
ll('llCSV2List', 1, 'list');
ll('llList2CSV', 1, 'string');
ll('llGetListLength', 1, 'integer');
ll('llList2Integer', 2, 'integer');
ll('llList2Float', 2, 'float');
ll('llList2String', 2, 'string');
ll('llList2Key', 2, 'key');
ll('llList2Vector', 2, 'vector');
ll('llList2Rot', 2, 'rotation');
ll('llList2List', 3, 'list');
ll('llList2ListStrided', 4, 'list');
ll('llDeleteSubList', 3, 'list');
ll('llListInsertList', 3, 'list');
ll('llListReplaceList', 4, 'list');
ll('llListFindList', 2, 'integer');
ll('llListRandomize', 2, 'list');
ll('llListSort', 3, 'list');
ll('llListStatistics', 2, 'float');
ll('llGetListEntryType', 2, 'integer');
ll('llList2Json', 2, 'string');
ll('llJson2List', 1, 'list');
ll('llJsonGetValue', 2, 'string');
ll('llJsonSetValue', 3, 'string');
ll('llJsonValueType', 2, 'string');

// Math
ll('llAbs', 1, 'integer');
ll('llFabs', 1, 'float');
ll('llSqrt', 1, 'float');
ll('llPow', 2, 'float');
ll('llLog', 1, 'float');
ll('llLog10', 1, 'float');
ll('llSin', 1, 'float');
ll('llCos', 1, 'float');
ll('llTan', 1, 'float');
ll('llAsin', 1, 'float');
ll('llAcos', 1, 'float');
ll('llAtan2', 2, 'float');
ll('llFloor', 1, 'integer');
ll('llCeil', 1, 'integer');
ll('llRound', 1, 'integer');
ll('llVecMag', 1, 'float');
ll('llVecNorm', 1, 'vector');
ll('llVecDist', 2, 'float');
ll('llRot2Euler', 1, 'vector');
ll('llEuler2Rot', 1, 'rotation');
ll('llAxes2Rot', 3, 'rotation');
ll('llAxisAngle2Rot', 2, 'rotation');
ll('llRot2Fwd', 1, 'vector');
ll('llRot2Left', 1, 'vector');
ll('llRot2Up', 1, 'vector');
ll('llRotBetween', 2, 'rotation');
ll('llAngleBetween', 2, 'float');
ll('llModPow', 3, 'integer');

// HTTP / experience / camera / money / memory
ll('llHTTPRequest', 3, 'key');
ll('llHTTPResponse', 3);
ll('llRequestURL', 0, 'key');
ll('llRequestSecureURL', 0, 'key');
ll('llReleaseURL', 1);
ll('llGetFreeURLs', 0, 'integer');
ll('llGetHTTPHeader', 2, 'string');
ll('llSetContentType', 2);
ll('llGetFreeMemory', 0, 'integer');
ll('llGetUsedMemory', 0, 'integer');
ll('llSetMemoryLimit', 1, 'integer');
ll('llGetMemoryLimit', 0, 'integer');
ll('llGetSPMaxMemory', 0, 'integer');
ll('llScriptProfiler', 1);
ll('llGiveMoney', 2, 'integer');
ll('llSetPayPrice', 2);
ll('llTransferLindenDollars', 2, 'key');
ll('llSetCameraEyeOffset', 1);
ll('llSetCameraAtOffset', 1);
ll('llClearCameraParams', 0);
ll('llSetCameraParams', 1);
ll('llGetCameraPos', 0, 'vector');
ll('llGetCameraRot', 0, 'rotation');
ll('llRequestExperiencePermissions', 2);
ll('llGetExperienceErrorMessage', 1, 'string');
ll('llAgentInExperience', 1, 'integer');
ll('llGenerateKey', 0, 'key');

export function lslFunctionSpec(name: string): { args: number; ret: string } | undefined {
  const row = LL_SPEC[name];
  if (!row) return undefined;
  return { args: row[0], ret: row[1] };
}

export const LSL_FUNCTION_NAMES: string[] = Object.keys(LL_SPEC);

const MONO_WARN_BYTES = 55 * 1024;

export function estimateMonoBytes(src: string): number {
  return 4096 + String(src || '').length * 6;
}

interface Tok {
  k: 'id' | 'num' | 'str' | 'op';
  t: string;
  line: number;
}

function tokenize(src: string, diags: LslDiagnostic[]): Tok[] {
  const toks: Tok[] = [];
  const n = src.length;
  let i = 0;
  let line = 1;
  const pushErr = (msg: string) => {
    diags.push({ line, message: msg, severity: 'error' });
  };

  while (i < n) {
    const ch = src[i];
    if (ch === '\n') {
      line++;
      i++;
      continue;
    }
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      i++;
      continue;
    }
    if (ch === '/' && src[i + 1] === '/') {
      i += 2;
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') line++;
        i++;
      }
      i = Math.min(n, i + 2);
      continue;
    }
    if (ch === '"') {
      const startLine = line;
      i++;
      let closed = false;
      while (i < n) {
        if (src[i] === '\\' && i + 1 < n) {
          i += 2;
          continue;
        }
        if (src[i] === '\n') {
          pushErr('string contains a raw newline (use \\n)');
          break;
        }
        if (src[i] === '"') {
          i++;
          closed = true;
          break;
        }
        i++;
      }
      if (!closed && i >= n) pushErr('unterminated string');
      const tok: Tok = { k: 'str', t: '""', line: startLine };
      if (toks.length && toks[toks.length - 1].k === 'str' && toks[toks.length - 1].line === startLine) {
        diags.push({
          line: startLine,
          message: 'adjacent strings (unescaped quote)',
          severity: 'error',
        });
      }
      toks.push(tok);
      continue;
    }
    if (ch === '.' && /[0-9]/.test(src[i + 1] || '')) {
      const start = i;
      i++;
      while (i < n && /[0-9]/.test(src[i])) i++;
      let lex = src.slice(start, i);
      if (src[i] === 'f' || src[i] === 'F') {
        pushErr(`float literal ${lex}f is not valid LSL`);
        i++;
      }
      toks.push({ k: 'num', t: lex, line });
      continue;
    }
    if (/[0-9]/.test(ch)) {
      const start = i;
      i++;
      while (i < n && /[0-9]/.test(src[i])) i++;
      if (src[i] === '.' && /[0-9]/.test(src[i + 1] || '')) {
        i++;
        while (i < n && /[0-9]/.test(src[i])) i++;
      }
      const lex = src.slice(start, i);
      if (src[i] === 'f' || src[i] === 'F') {
        pushErr(`float literal ${lex}f is not valid LSL`);
        i++;
      }
      toks.push({ k: 'num', t: lex, line });
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const start = i;
      i++;
      while (i < n && /[A-Za-z0-9_]/.test(src[i])) i++;
      toks.push({ k: 'id', t: src.slice(start, i), line });
      continue;
    }
    const three = src.slice(i, i + 3);
    if (three === '===' || three === '!==') {
      toks.push({ k: 'op', t: three, line });
      i += 3;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (['==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%='].includes(two)) {
      toks.push({ k: 'op', t: two, line });
      i += 2;
      continue;
    }
    toks.push({ k: 'op', t: ch, line });
    i++;
  }
  return toks;
}

function incompatible(dst: string, src: string): boolean {
  if (!dst || !src || dst === src) return false;
  if (dst === 'float' && src === 'integer') return false;
  if ((dst === 'key' && src === 'string') || (dst === 'string' && src === 'key')) return false;
  return true;
}

function isConstName(name: string): boolean {
  return /^[A-Z][A-Z0-9_]+$/.test(name);
}

interface ScanOpts {
  stopSemi: boolean;
  stopComma: boolean;
  stopParen: boolean;
  stopAngle: boolean;
  eatSemi: boolean;
  trackSimple: boolean;
}

class Parser {
  private toks: Tok[];
  private i = 0;
  private errors: LslDiagnostic[] = [];
  private warnings: LslDiagnostic[] = [];
  private seen = new Set<string>();
  private globals = new Map<string, string>();
  private locals = new Map<string, string>();
  private inFunction = false;
  private inEvent = false;
  private seenState = false;
  private fnRet = '';
  private fnReturned = false;
  private fnOpen = false;
  private stateNames = new Set<string>(['default']);
  private stateJumps: { name: string; line: number }[] = [];
  private eventsInState = new Set<string>();
  private allEvents = new Set<string>();
  private definedFns = new Set<string>();
  private prevT = '';
  private expectPrimary = true;
  private simpleType = '';
  private simpleBroken = false;
  private initSawCall = false;
  private trackSimple = false;
  private listenZero = false;
  private timerPositive = false;
  private timerZero = false;
  private sawHttp = false;
  private streaming: boolean;

  constructor(toks: Tok[], streaming: boolean) {
    this.toks = toks;
    this.streaming = streaming;
  }

  run(source: string): LslLintResult {
    this.parseTop();
    for (const j of this.stateJumps) {
      if (!this.stateNames.has(j.name)) this.err(j.line, `unknown state '${j.name}'`);
    }
    if (this.sawHttp && !this.allEvents.has('http_response')) {
      this.warn(1, 'llHTTPRequest without an http_response event');
    }
    if (this.timerPositive && !this.timerZero) {
      this.warn(1, 'llSetTimerEvent is armed but never stopped with llSetTimerEvent(0.0)');
    }
    const bytes = estimateMonoBytes(source);
    if (bytes > MONO_WARN_BYTES) {
      this.warn(1, `Mono memory estimate ~${(bytes / 1024).toFixed(1)} KB is above 55 KB (64 KB limit)`);
    }
    return { errors: this.errors, warnings: this.warnings };
  }

  private peek(k = 0): Tok | undefined {
    return this.toks[this.i + k];
  }
  private eof(): boolean {
    return this.i >= this.toks.length;
  }
  private check(t: string): boolean {
    return this.peek()?.t === t;
  }
  private eat(): Tok {
    const t = this.toks[this.i++];
    this.prevT = t.t;
    return t;
  }
  private err(line: number, message: string) {
    const key = `${line}|${message}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.errors.push({ line, message, severity: 'error' });
  }
  private warn(line: number, message: string) {
    const key = `w|${line}|${message}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.warnings.push({ line, message, severity: 'warning' });
  }
  private isType(tok: Tok | undefined): boolean {
    return !!tok && tok.k === 'id' && (LSL_TYPES as readonly string[]).includes(tok.t);
  }
  private noteIdent(tok: Tok) {
    if (isConstName(tok.t) || this.locals.has(tok.t) || this.globals.has(tok.t) || this.definedFns.has(tok.t)) {
      return;
    }
    this.err(tok.line, `undeclared variable '${tok.t}'`);
  }
  private lookupType(name: string): string {
    if (this.locals.has(name)) return this.locals.get(name) || '';
    if (this.globals.has(name)) return this.globals.get(name) || '';
    if (CONST_TYPES[name]) return CONST_TYPES[name];
    return '';
  }
  private notePrimary(type: string) {
    if (!this.trackSimple || this.simpleBroken) return;
    if (!this.simpleType) this.simpleType = type;
  }
  private noteBinary() {
    if (this.trackSimple) this.simpleBroken = true;
    this.expectPrimary = true;
  }

  private parseTop() {
    while (!this.eof()) {
      const t = this.peek()!;
      if (t.t === 'default' || (t.t === 'state' && this.peek(1)?.k === 'id' && this.peek(2)?.t === '{')) {
        this.parseState();
        continue;
      }
      if (this.isType(t) || (t.k === 'id' && this.peek(1)?.t === '(')) {
        this.parseDeclOrFunc();
        continue;
      }
      if (NON_LSL.has(t.t)) {
        this.err(t.line, `${t.t} not in LSL`);
        this.eat();
        continue;
      }
      this.err(t.line, `unexpected token '${t.t}'`);
      this.eat();
    }
  }

  private parseState() {
    const t = this.eat();
    let name = 'default';
    if (t.t === 'state') {
      const id = this.peek();
      if (!id || id.k !== 'id') {
        this.err(t.line, 'state name expected');
        return;
      }
      name = this.eat().t;
    }
    this.stateNames.add(name);
    this.seenState = true;
    if (!this.check('{')) {
      this.err(t.line, 'missing { after state');
      return;
    }
    this.eat();
    this.eventsInState = new Set();
    while (!this.eof() && !this.check('}')) {
      this.parseEvent();
    }
    if (this.check('}')) this.eat();
  }

  private parseEvent() {
    const nameTok = this.peek();
    if (!nameTok || nameTok.k !== 'id') {
      this.err(nameTok?.line || 1, 'event name expected');
      if (!this.eof()) this.eat();
      return;
    }
    const spec = LSL_EVENT_PARAMS[nameTok.t];
    if (!spec) {
      this.err(nameTok.line, `unknown event '${nameTok.t}'`);
    } else if (this.eventsInState.has(nameTok.t)) {
      this.err(nameTok.line, `event '${nameTok.t}' declared twice in this state`);
    } else {
      this.eventsInState.add(nameTok.t);
      this.allEvents.add(nameTok.t);
    }
    this.eat();
    if (!this.check('(')) {
      this.err(nameTok.line, `missing ( after ${nameTok.t}`);
      return;
    }
    this.eat();
    const params = this.parseParams();
    if (this.check(')')) this.eat();
    if (spec && params.length !== spec.length) {
      this.err(nameTok.line, `event \`${nameTok.t}\` expects ${spec.length} parameter(s), found ${params.length}`);
    } else if (spec) {
      params.forEach((p, idx) => {
        if (p.type !== spec[idx]) {
          this.err(p.line, `${nameTok.t} parameter must be ${spec[idx]}`);
        }
      });
    }
    this.locals = new Map(params.map((p) => [p.name, p.type]));
    this.inEvent = true;
    this.inFunction = false;
    this.fnRet = '';
    this.parseBraceBody();
    this.inEvent = false;
    this.locals = new Map();
  }

  private parseDeclOrFunc() {
    const t = this.peek()!;
    const typed = this.isType(t);
    const nameTok = typed ? this.peek(1) : t;
    const afterName = typed ? this.peek(2) : this.peek(1);
    if (nameTok && nameTok.k === 'id' && afterName?.t === '(') {
      if (typed) this.eat();
      const ret = typed ? t.t : '';
      const nm = this.eat();
      if (LSL_EVENT_PARAMS[nm.t] && !typed) {
        this.err(nm.line, `event '${nm.t}' declared outside any state`);
      } else if (this.seenState) {
        this.err(nm.line, 'function declared after state');
      }
      this.definedFns.add(nm.t);
      if (!this.check('(')) return;
      this.eat();
      const params = this.parseParams();
      if (this.check(')')) this.eat();
      this.locals = new Map(params.map((p) => [p.name, p.type]));
      this.inFunction = true;
      this.inEvent = false;
      this.fnRet = ret;
      this.fnReturned = false;
      this.fnOpen = false;
      this.parseBraceBody();
      if (ret && !this.fnReturned && !this.fnOpen) {
        this.err(nm.line, `typed function '${nm.t}' missing a return`);
      }
      this.inFunction = false;
      this.locals = new Map();
      return;
    }
    if (typed) {
      if (this.seenState) this.err(t.line, 'global declared after state');
      this.parseGlobal();
      return;
    }
    this.err(t.line, `unexpected token '${t.t}'`);
    this.eat();
  }

  private parseGlobal() {
    const typeTok = this.eat();
    const nameTok = this.peek();
    if (!nameTok || nameTok.k !== 'id') {
      this.err(typeTok.line, 'variable name expected');
      return;
    }
    this.eat();
    if (this.globals.has(nameTok.t)) {
      this.err(nameTok.line, `variable '${nameTok.t}' declared twice in the same scope`);
    }
    if (this.check('=')) {
      this.eat();
      const init = this.readInitializer();
      if (init.hasCall) this.err(nameTok.line, 'non-constant global initialiser');
      if (init.type && incompatible(typeTok.t, init.type)) {
        this.err(nameTok.line, `type mismatch: cannot assign ${init.type} to ${typeTok.t}`);
      }
    } else if (this.check(';')) {
      this.eat();
    } else if (!(this.streaming && this.eof())) {
      this.err(nameTok.line, 'missing semicolon');
    }
    this.globals.set(nameTok.t, typeTok.t);
  }

  private parseParams(): { name: string; type: string; line: number }[] {
    const params: { name: string; type: string; line: number }[] = [];
    if (this.check(')')) return params;
    while (!this.eof() && !this.check(')')) {
      const ty = this.peek();
      if (!this.isType(ty)) {
        this.err(ty?.line || 1, 'parameter must have a type');
        break;
      }
      const typeTok = this.eat();
      const nameTok = this.peek();
      if (!nameTok || nameTok.k !== 'id') {
        this.err(typeTok.line, 'parameter name expected');
        break;
      }
      this.eat();
      if (params.some((p) => p.name === nameTok.t)) {
        this.err(nameTok.line, `variable '${nameTok.t}' declared twice in the same scope`);
      }
      params.push({ name: nameTok.t, type: typeTok.t, line: nameTok.line });
      if (this.check(',')) {
        this.eat();
        continue;
      }
      break;
    }
    return params;
  }

  private parseBraceBody() {
    if (!this.check('{')) {
      this.fnOpen = true;
      return;
    }
    this.eat();
    this.parseBlock();
    if (this.check('}')) this.eat();
    else this.fnOpen = true;
  }

  private parseBlock() {
    while (!this.eof() && !this.check('}')) {
      const before = this.i;
      this.parseStmt();
      if (this.i === before) this.eat();
    }
  }

  private parseBody() {
    if (this.check('{')) {
      this.eat();
      this.parseBlock();
      if (this.check('}')) this.eat();
      return;
    }
    this.parseStmt();
  }

  private parseStmt() {
    if (this.eof() || this.check('}')) return;
    const t = this.peek()!;
    if (t.t === ';') {
      this.eat();
      return;
    }
    if (t.t === 'if') return this.parseIf();
    if (t.t === 'while') return this.parseWhile();
    if (t.t === 'for') return this.parseFor();
    if (t.t === 'do') return this.parseDo();
    if (t.t === 'else') {
      this.err(t.line, 'else without if');
      this.eat();
      return;
    }
    if (t.t === 'return') return this.parseReturn();
    if (t.t === 'jump') {
      const line = t.line;
      this.eat();
      if (this.peek()?.k === 'id') this.eat();
      if (this.check(';')) this.eat();
      else this.err(line, 'missing semicolon');
      return;
    }
    if (t.t === '@') {
      this.eat();
      if (this.peek()?.k === 'id') this.eat();
      if (this.check(';')) this.eat();
      return;
    }
    if (t.t === 'state') return this.parseStateChange();
    if (t.k === 'id' && NON_LSL.has(t.t)) return this.parseBadKeyword();
    if (this.isType(t)) return this.parseLocal();
    if (t.k === 'id' && this.peek(1) && ['=', '+=', '-=', '*=', '/='].includes(this.peek(1)!.t) && this.peek(2)?.t !== '(') {
      return this.parseAssign();
    }
    this.parseExprStmt();
  }

  private parseBadKeyword() {
    const t = this.eat();
    this.err(t.line, `${t.t} not in LSL`);
    if (this.check('(')) {
      this.eat();
      this.scanExpr({ stopSemi: false, stopComma: false, stopParen: true, stopAngle: false, eatSemi: false, trackSimple: false });
      if (this.check(')')) this.eat();
    }
    if (this.check('{')) {
      this.eat();
      let depth = 1;
      while (!this.eof() && depth > 0) {
        const n = this.eat();
        if (n.t === '{') depth++;
        else if (n.t === '}') depth--;
      }
      return;
    }
    const end = this.scanExpr({ stopSemi: true, stopComma: false, stopParen: false, stopAngle: false, eatSemi: false, trackSimple: false });
    if (end === 'semi') this.eat();
  }

  private parseIf() {
    this.eat();
    if (this.check('(')) {
      this.eat();
      this.scanExpr({ stopSemi: false, stopComma: false, stopParen: true, stopAngle: false, eatSemi: false, trackSimple: false });
      if (this.check(')')) this.eat();
    }
    this.parseBody();
    if (this.check('else')) {
      this.eat();
      this.parseBody();
    }
  }

  private parseWhile() {
    this.eat();
    if (this.check('(')) {
      this.eat();
      this.scanExpr({ stopSemi: false, stopComma: false, stopParen: true, stopAngle: false, eatSemi: true, trackSimple: false });
      if (this.check(')')) this.eat();
    }
    this.parseBody();
  }

  private parseFor() {
    this.eat();
    if (this.check('(')) {
      this.eat();
      this.scanExpr({ stopSemi: false, stopComma: false, stopParen: true, stopAngle: false, eatSemi: true, trackSimple: false });
      if (this.check(')')) this.eat();
    }
    this.parseBody();
  }

  private parseDo() {
    this.eat();
    this.parseBody();
    if (this.peek()?.t === 'while') this.eat();
    if (this.check('(')) {
      this.eat();
      this.scanExpr({ stopSemi: false, stopComma: false, stopParen: true, stopAngle: false, eatSemi: false, trackSimple: false });
      if (this.check(')')) this.eat();
    }
    if (this.check(';')) this.eat();
    else if (!(this.streaming && this.eof())) this.err(this.peek()?.line || 1, 'missing semicolon');
  }

  private parseReturn() {
    const line = this.eat().line;
    if (this.check(';')) {
      this.eat();
      return;
    }
    if (this.inEvent) this.err(line, 'return with a value inside an event');
    else if (this.fnRet) this.fnReturned = true;
    else if (this.inFunction) this.err(line, 'return with a value inside a function that has no return type');
    const end = this.scanExpr({ stopSemi: true, stopComma: false, stopParen: false, stopAngle: false, eatSemi: false, trackSimple: false });
    if (end === 'semi') this.eat();
    else if (end !== 'eof' || !this.streaming) this.err(line, 'missing semicolon');
  }

  private parseStateChange() {
    const line = this.eat().line;
    const nameTok = this.peek();
    const name = nameTok && nameTok.k === 'id' ? this.eat().t : '';
    if (!name) {
      this.err(line, 'state name expected');
      return;
    }
    if (this.inFunction) this.err(line, 'state change in function');
    else this.stateJumps.push({ name, line });
    if (this.check(';')) this.eat();
    else this.err(line, 'missing semicolon');
  }

  private parseLocal() {
    const typeTok = this.eat();
    const nameTok = this.peek();
    if (!nameTok || nameTok.k !== 'id') {
      this.err(typeTok.line, 'variable name expected');
      return;
    }
    this.eat();
    if (this.locals.has(nameTok.t)) {
      this.err(nameTok.line, `variable '${nameTok.t}' declared twice in the same scope`);
    }
    if (this.check('=')) {
      this.eat();
      const init = this.readInitializer();
      if (init.type && incompatible(typeTok.t, init.type)) {
        this.err(nameTok.line, `type mismatch: cannot assign ${init.type} to ${typeTok.t}`);
      }
    } else if (this.check(';')) this.eat();
    else if (!(this.streaming && this.eof())) this.err(nameTok.line, 'missing semicolon');
    this.locals.set(nameTok.t, typeTok.t);
  }

  private parseAssign() {
    const nameTok = this.eat();
    this.noteIdent(nameTok);
    const op = this.eat().t;
    const dest = this.lookupType(nameTok.t);
    this.simpleType = '';
    this.simpleBroken = false;
    this.initSawCall = false;
    const end = this.scanExpr({ stopSemi: true, stopComma: false, stopParen: false, stopAngle: false, eatSemi: false, trackSimple: true });
    if (end === 'semi') this.eat();
    else if (end !== 'eof' || !this.streaming) this.err(nameTok.line, 'missing semicolon');
    const src = this.simpleBroken ? '' : this.simpleType;
    if (dest && src) {
      const listAppend = op === '+=' && dest === 'list';
      if (!listAppend && incompatible(dest, src)) {
        this.err(nameTok.line, `type mismatch: cannot assign ${src} to ${dest}`);
      }
    }
  }

  private parseExprStmt() {
    const line = this.peek()?.line || 1;
    const end = this.scanExpr({ stopSemi: true, stopComma: false, stopParen: false, stopAngle: false, eatSemi: false, trackSimple: false });
    if (end === 'semi') this.eat();
    else if (end === 'eof' && this.streaming) return;
    else this.err(line, 'missing semicolon');
  }

  private readInitializer(): { type: string; hasCall: boolean } {
    this.simpleType = '';
    this.simpleBroken = false;
    this.initSawCall = false;
    const end = this.scanExpr({ stopSemi: true, stopComma: false, stopParen: false, stopAngle: false, eatSemi: false, trackSimple: true });
    if (end === 'semi') this.eat();
    else if (!(this.streaming && end === 'eof')) this.err(this.peek()?.line || 1, 'missing semicolon');
    return { type: this.simpleBroken ? '' : this.simpleType, hasCall: this.initSawCall };
  }

  private vectorStart(): boolean {
    if (!this.prevT) return true;
    if (['id', 'num', 'str'].includes(this.toks[this.i - 1]?.k || '') && this.prevT !== '<' && this.prevT !== '(') {
      const prev = this.toks[this.i - 1];
      if (prev && (prev.k === 'id' || prev.k === 'num' || prev.k === 'str' || prev.t === ')' || prev.t === ']')) return false;
    }
    return true;
  }

  private scanExpr(opts: ScanOpts): 'semi' | 'comma' | 'paren' | 'brace' | 'rbrace' | 'angle' | 'brack' | 'eof' {
    const savedTrack = this.trackSimple;
    this.trackSimple = opts.trackSimple;
    this.expectPrimary = true;
    let paren = 0;
    let brack = 0;
    while (!this.eof()) {
      const t = this.peek()!;
      const flat = paren === 0 && brack === 0;
      if (flat && opts.stopSemi && t.t === ';') {
        this.trackSimple = savedTrack;
        return 'semi';
      }
      if (flat && opts.eatSemi && t.t === ';') {
        this.eat();
        this.expectPrimary = true;
        continue;
      }
      if (flat && opts.stopComma && t.t === ',') {
        this.trackSimple = savedTrack;
        return 'comma';
      }
      if (flat && opts.stopParen && t.t === ')') {
        this.trackSimple = savedTrack;
        return 'paren';
      }
      if (flat && opts.stopAngle && t.t === '>') {
        this.trackSimple = savedTrack;
        return 'angle';
      }
      if (flat && t.t === ']') {
        this.trackSimple = savedTrack;
        return 'brack';
      }
      if (flat && t.t === '{') {
        this.trackSimple = savedTrack;
        return 'brace';
      }
      if (flat && t.t === '}') {
        this.trackSimple = savedTrack;
        return 'rbrace';
      }
      if (t.t === '===' || t.t === '!==') {
        this.err(t.line, `${t.t} is not valid LSL`);
        this.eat();
        continue;
      }
      if (t.t === '?') {
        this.err(t.line, 'ternary ?: is not valid LSL');
        this.noteBinary();
        this.eat();
        continue;
      }
      if (t.k === 'id' && this.peek(1)?.t === '(') {
        this.parseCall(t.t, t.line);
        this.expectPrimary = false;
        continue;
      }
      if (t.t === '<' && this.vectorStart()) {
        this.parseVector();
        this.expectPrimary = false;
        continue;
      }
      if (t.t === '[') {
        this.parseList();
        this.expectPrimary = false;
        continue;
      }
      if (t.t === '(' && this.isType(this.peek(1)) && this.peek(2)?.t === ')') {
        const ty = this.peek(1)!.t;
        this.eat();
        this.eat();
        this.eat();
        this.notePrimary(ty);
        this.simpleType = this.trackSimple ? ty : this.simpleType;
        if (this.trackSimple) this.simpleType = ty;
        this.expectPrimary = false;
        continue;
      }
      if (t.t === '(') {
        paren++;
        this.eat();
        this.expectPrimary = true;
        continue;
      }
      if (t.t === ')' && paren > 0) {
        paren--;
        this.eat();
        this.expectPrimary = false;
        continue;
      }
      if (t.t === ']' && brack > 0) {
        brack--;
        this.eat();
        continue;
      }
      if (t.k === 'id') {
        if (this.prevT !== '.') this.noteIdent(t);
        if (this.prevT !== '.') this.notePrimary(this.lookupType(t.t));
        this.eat();
        this.expectPrimary = false;
        continue;
      }
      if (t.k === 'str') {
        this.notePrimary('string');
        this.eat();
        this.expectPrimary = false;
        continue;
      }
      if (t.k === 'num') {
        this.notePrimary(t.t.includes('.') ? 'float' : 'integer');
        this.eat();
        this.expectPrimary = false;
        continue;
      }
      if ((t.t === '++' || t.t === '--') && !this.expectPrimary) {
        this.eat();
        continue;
      }
      if (this.expectPrimary && (t.t === '-' || t.t === '!' || t.t === '~' || t.t === '++' || t.t === '--')) {
        this.eat();
        continue;
      }
      if (['+', '-', '*', '/', '%', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '&', '|', '^', '+=', '-=', '*=', '/=', '%='].includes(t.t)) {
        this.noteBinary();
        this.eat();
        continue;
      }
      if (t.t === '.') {
        this.eat();
        this.expectPrimary = true;
        continue;
      }
      if (t.t === ',') {
        this.eat();
        this.expectPrimary = true;
        continue;
      }
      this.eat();
    }
    this.trackSimple = savedTrack;
    return 'eof';
  }

  private parseCall(name: string, line: number) {
    this.eat(); // name
    this.eat(); // (
    this.initSawCall = true;
    const argTexts: string[] = [];
    if (!this.check(')')) {
      while (!this.eof()) {
        const start = this.i;
        const end = this.scanExpr({ stopSemi: false, stopComma: true, stopParen: true, stopAngle: false, eatSemi: false, trackSimple: false });
        argTexts.push(this.toks.slice(start, this.i).map((tk) => tk.t).join(''));
        if (end === 'comma') {
          this.eat();
          continue;
        }
        break;
      }
    }
    if (this.check(')')) this.eat();
    else this.err(line, `missing ) after ${name}`);

    if (name.startsWith('ll')) {
      const spec = LL_SPEC[name];
      if (!spec) this.err(line, `unknown function ${name}`);
      else if (argTexts.length !== spec[0]) this.err(line, `${name} expects ${spec[0]} arguments`);
      else if (this.trackSimple && spec[1]) this.notePrimary(spec[1]);
      if (name === 'llListen' && argTexts[0] === '0') {
        this.listenZero = true;
        this.warn(line, 'llListen on channel 0 (public chat spam)');
      }
      if (name === 'llSetTimerEvent' && argTexts.length === 1 && /^-?\d+(\.\d+)?$/.test(argTexts[0])) {
        const n = Number(argTexts[0]);
        if (n === 0) this.timerZero = true;
        else if (n > 0) this.timerPositive = true;
      }
      if (name === 'llHTTPRequest') this.sawHttp = true;
      if (spec && spec[1] && this.trackSimple) this.simpleType = this.simpleBroken ? this.simpleType : spec[1];
    }
    this.expectPrimary = false;
  }

  private parseVector() {
    const start = this.peek()!;
    this.eat(); // <
    let parts = 1;
    while (!this.eof() && !this.check('>')) {
      const end = this.scanExpr({ stopSemi: false, stopComma: true, stopParen: false, stopAngle: true, eatSemi: false, trackSimple: false });
      if (this.check('>') || end === 'angle' || end === 'eof') break;
      if (this.check(',')) {
        parts++;
        this.eat();
        continue;
      }
      break;
    }
    if (this.check('>')) this.eat();
    else this.err(start.line, 'unclosed vector/rotation literal');
    if (parts !== 3 && parts !== 4) {
      this.err(start.line, `vector built with ${parts} components`);
    } else if (this.trackSimple) {
      this.notePrimary(parts === 4 ? 'rotation' : 'vector');
    }
  }

  private parseList() {
    this.eat(); // [
    if (!this.check(']')) {
      while (!this.eof() && !this.check(']')) {
        const end = this.scanExpr({ stopSemi: false, stopComma: true, stopParen: false, stopAngle: false, eatSemi: false, trackSimple: false });
        if (end === 'brack' || this.check(']')) break;
        if (this.check(',')) {
          this.eat();
          continue;
        }
        break;
      }
    }
    if (this.check(']')) this.eat();
    if (this.trackSimple) this.notePrimary('list');
  }
}

export function lintLslScript(src: string, opts: { streaming?: boolean } = {}): LslLintResult {
  const early: LslDiagnostic[] = [];
  const toks = tokenize(String(src || ''), early);
  const parser = new Parser(toks, !!opts.streaming);
  const result = parser.run(String(src || ''));
  return {
    errors: [...early.filter((d) => d.severity === 'error'), ...result.errors],
    warnings: [...early.filter((d) => d.severity === 'warning'), ...result.warnings],
  };
}

/** Last index that ends a finished statement, safe to check while tokens are still arriving. */
export function stableLslPrefix(src: string): string {
  const s = String(src || '');
  const n = s.length;
  let i = 0;
  let paren = 0;
  let brack = 0;
  let last = -1;
  while (i < n) {
    const ch = s[i];
    if (ch === '/' && s[i + 1] === '/') {
      i += 2;
      while (i < n && s[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && s[i + 1] === '*') {
      i += 2;
      while (i < n && !(s[i] === '*' && s[i + 1] === '/')) i++;
      i = Math.min(n, i + 2);
      continue;
    }
    if (ch === '"') {
      i++;
      while (i < n) {
        if (s[i] === '\\' && i + 1 < n) {
          i += 2;
          continue;
        }
        if (s[i] === '"') {
          i++;
          break;
        }
        if (s[i] === '\n') break;
        i++;
      }
      continue;
    }
    if (ch === '(') paren++;
    else if (ch === ')' && paren > 0) paren--;
    else if (ch === '[') brack++;
    else if (ch === ']' && brack > 0) brack--;
    else if (paren === 0 && brack === 0 && (ch === ';' || ch === '{' || ch === '}')) last = i;
    i++;
  }
  if (last < 0) return '';
  return s.slice(0, last + 1);
}

export function formatLslDiagnostics(list: LslDiagnostic[]): string[] {
  return list.map((d) => (d.line > 0 ? `Line ${d.line}: ${d.message}` : d.message));
}
