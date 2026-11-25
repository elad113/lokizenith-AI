/**
 * Official Second Life / OpenSimulator LSL2 Built-in Function Allowlist.
 * Shared across server prompts and static LSL verifier.
 */

export const BANNED_HALLUCINATED_LSL_FUNCTIONS = [
  'llAngleClamp',
  'llResetScriptTimer',
  'llResetTimer',
  'llChat',
  'llSayTo',
  'llSetScriptTimer',
  'llGetScriptTimer',
  'llClamp',
  'llLerp',
  'llBoolean',
  'llRot2List',
  'llList2Euler',
] as const;

export const OFFICIAL_LSL_FUNCTIONS_LIST: readonly string[] = [
  // Communication & Dialogs
  'llSay', 'llWhisper', 'llShout', 'llOwnerSay', 'llRegionSay', 'llRegionSayTo', 'llInstantMessage',
  'llListen', 'llListenRemove', 'llListenControl', 'llDialog', 'llTextBox', 'llLoadURL', 'llMapDestination',
  // Timers, Sleep, Memory & Script Lifecycle
  'llSetTimerEvent', 'llGetTime', 'llResetTime', 'llGetAndResetTime', 'llSleep', 'llMinEventDelay',
  'llResetScript', 'llResetOtherScript', 'llSetScriptState', 'llGetScriptState', 'llGetScriptName',
  'llGetFreeMemory', 'llGetUsedMemory', 'llSetMemoryLimit', 'llGetMemoryLimit', 'llDie',
  'llGetUnixTime', 'llGetTimestamp', 'llGetGMTclock', 'llGetWallclock', 'llGetDate', 'llGetStartParameter',
  'llGetTimeOfDay', 'llGetEnv',
  // Owner, Avatar & Detection
  'llGetOwner', 'llGetOwnerKey', 'llGetCreator', 'llGetKey', 'llGetLinkKey', 'llGetObjectName', 'llSetObjectName',
  'llGetObjectDesc', 'llSetObjectDesc', 'llGetObjectDetails', 'llGetObjectMass', 'llGetMass', 'llGetMassMKS',
  'llDetectedKey', 'llDetectedName', 'llDetectedOwner', 'llDetectedPos', 'llDetectedRot', 'llDetectedVel',
  'llDetectedType', 'llDetectedLinkNumber', 'llDetectedTouchFace', 'llDetectedTouchUV', 'llDetectedTouchST',
  'llDetectedTouchPos', 'llDetectedTouchNormal', 'llDetectedTouchBinormal', 'llDetectedGrab', 'llDetectedGroup',
  'llKey2Name', 'llGetDisplayName', 'llGetUsername', 'llRequestDisplayName', 'llRequestUsername', 'llRequestAgentData',
  'llGetAgentSize', 'llGetAgentInfo', 'llGetAgentList', 'llGetAgentLanguage', 'llSameGroup', 'llAvatarOnSitTarget', 'llAvatarOnLinkSitTarget',
  // Permissions, Controls, Animations & Sit
  'llRequestPermissions', 'llGetPermissions', 'llGetPermissionsKey', 'llStartAnimation', 'llStopAnimation',
  'llGetAnimation', 'llGetAnimationList', 'llGetAnimationOverride', 'llSetAnimationOverride', 'llResetAnimationOverride',
  'llTakeControls', 'llReleaseControls', 'llSitTarget', 'llLinkSitTarget', 'llUnSit', 'llSetSitText', 'llSetTouchText',
  'llAttachToAvatar', 'llAttachToAvatarTemp', 'llDetachFromAvatar', 'llGetAttached', 'llSetCameraParams',
  'llClearCameraParams', 'llSetCameraEyeOffset', 'llSetCameraAtOffset', 'llForceMouselook',
  'llRequestExperiencePermissions', 'llGetExperienceDetails', 'llAgentInExperience', 'llResetAnimationOverride',
  // Primitives, Links, Visuals, Text & Particles
  'llSetLinkPrimitiveParamsFast', 'llSetLinkPrimitiveParams', 'llSetPrimitiveParams',
  'llGetLinkPrimitiveParams', 'llGetPrimitiveParams', 'llSetPos', 'llGetPos', 'llSetRegionPos',
  'llGetLocalPos', 'llGetRootPosition', 'llSetRot', 'llGetRot', 'llSetLocalRot', 'llGetLocalRot', 'llGetRootRotation',
  'llSetScale', 'llGetScale', 'llSetColor', 'llGetColor', 'llSetLinkColor', 'llSetAlpha', 'llGetAlpha', 'llSetLinkAlpha',
  'llSetTexture', 'llGetTexture', 'llSetLinkTexture', 'llScaleTexture', 'llOffsetTexture', 'llRotateTexture',
  'llSetTextureAnim', 'llSetText', 'llSetLinkText', 'llParticleSystem', 'llLinkParticleSystem',
  'llSetHoverHeight', 'llStopHover', 'llLookAt', 'llStopLookAt', 'llRotLookAt', 'llStopRotLookAt', 'llTargetOmega',
  'llGetNumberOfPrims', 'llGetNumberOfSides', 'llGetLinkNumber', 'llGetLinkName', 'llGetLinkNumberOfSides',
  'llCreateLink', 'llBreakLink', 'llBreakAllLinks', 'llMessageLinked', 'llSetPayPrice', 'llSetClickAction',
  'llPassTouches', 'llPassCollisions', 'llCollisionFilter', 'llSetLinkTextureAnim', 'llSetKeyframedMotion', 'llScaleByFactor',
  'llGetGeometricCenter', 'llGetBoundingBox', 'llGetCenterOfMass', 'llGetObjectPrimCount', 'llGetObjectLinkKey',
  'llUpdateCharacter', 'llGetStaticPath', 'llSetContentType', 'llGetNotecardLineSync',
  // Physics, Vehicles, Volume & Navigation
  'llSetStatus', 'llGetStatus', 'llSetBuoyancy', 'llApplyImpulse', 'llApplyRotationalImpulse', 'llSetForce',
  'llSetTorque', 'llSetForceAndTorque', 'llSetVelocity', 'llSetAngularVelocity', 'llGetVel', 'llGetAccel',
  'llGetOmega', 'llMoveToTarget', 'llStopMoveToTarget', 'llRotTarget', 'llRotTargetRemove', 'llTarget', 'llTargetRemove',
  'llSetVehicleType', 'llSetVehicleFloatParam', 'llSetVehicleVectorParam', 'llSetVehicleRotationParam', 'llSetVehicleFlags',
  'llRemoveVehicleFlags', 'llVolumeDetect', 'llSetDamage', 'llPushObject', 'llSetPhysicsMaterial', 'llGetPhysicsMaterial',
  'llCreateCharacter', 'llDeleteCharacter', 'llNavigateTo', 'llWanderWithin', 'llPursue', 'llFleeFrom', 'llEvade', 'llPatrolPoints', 'llExecCharacterCmd',
  // Sensors & Raycasting & Region
  'llSensor', 'llSensorRepeat', 'llSensorRemove', 'llCastRay', 'llGround', 'llWater', 'llWind', 'llCloud',
  'llGroundNormal', 'llGroundSlope', 'llGroundContour', 'llEdgeOfWorld',
  'llGetRegionName', 'llGetRegionCorner', 'llGetRegionFPS', 'llGetRegionTimeDilation', 'llRequestSimulatorData', 'llGetSimulatorHostname',
  'llGetSunDirection', 'llGetMoonDirection', 'llGetRegionFlags', 'llGetRegionAgentCount',
  // Sound & Media
  'llPlaySound', 'llLoopSound', 'llStopSound', 'llTriggerSound', 'llPreloadSound', 'llAdjustSoundVolume',
  'llSetSoundQueueing', 'llSetSoundRadius', 'llLinkPlaySound', 'llLinkLoopSound', 'llLinkStopSound',
  'llSetLinkMedia', 'llGetLinkMedia', 'llClearLinkMedia', 'llParcelMediaCommandList', 'llParcelMediaQuery', 'llSetParcelMusicURL',
  'llCollisionSound', 'llCollisionSprite',
  // Inventory, Notecards, Rez & Give
  'llGetInventoryNumber', 'llGetInventoryName', 'llGetInventoryType', 'llGetInventoryKey', 'llGetInventoryPermMask',
  'llGetInventoryCreator', 'llGetInventoryDesc', 'llRemoveInventory', 'llAllowInventoryDrop', 'llGiveInventory', 'llGiveInventoryList',
  'llGetNotecardLine', 'llGetNumberOfNotecardLines', 'llRequestInventoryData', 'llRezObject', 'llRezObjectWithParams', 'llRezAtRoot',
  'llRemoteLoadScriptPin', 'llSetRemoteScriptAccessPin',
  // Money, Parcel & Land
  'llGiveMoney', 'llTransferLindenDollars', 'llEjectFromLand', 'llTeleportAgentHome', 'llTeleportAgent', 'llTeleportAgentGlobalCoords',
  'llOverMyLand', 'llGetLandOwnerAt', 'llGetParcelDetails', 'llGetParcelFlags', 'llGetParcelPrimCount', 'llGetParcelPrimOwners',
  'llAddToLandPassList', 'llRemoveFromLandPassList', 'llAddToLandBanList', 'llRemoveFromLandBanList', 'llResetLandBanList', 'llResetLandPassList',
  'llReturnObjectsByOwner', 'llReturnObjectsByID',
  // HTTP, Email & External
  'llHTTPRequest', 'llHTTPResponse', 'llRequestURL', 'llRequestSecureURL', 'llReleaseURL', 'llEscapeURL', 'llUnescapeURL',
  'llGetHTTPHeader', 'llEmail', 'llGetNextEmail', 'llSetPrimURL', 'llRefreshPrimURL',
  // Lists, Strings, JSON, LinksetData & Keys
  'llGetListLength', 'llList2Integer', 'llList2Float', 'llList2String', 'llList2Key', 'llList2Vector', 'llList2Rot',
  'llList2List', 'llDeleteSubList', 'llListInsertList', 'llListReplaceList', 'llListFindList', 'llListFindListNext', 'llListSort',
  'llListRandomize', 'llList2ListStrided', 'llListStatistics', 'llDumpList2String', 'llParseString2List', 'llParseStringKeepNulls',
  'llCSV2List', 'llList2CSV', 'llList2Json', 'llJson2List', 'llJsonGetValue', 'llJsonSetValue', 'llJsonValueType',
  'llStringLength', 'llGetSubString', 'llDeleteSubString', 'llInsertString', 'llSubStringIndex', 'llStringTrim',
  'llToLower', 'llToUpper', 'llBase64ToString', 'llStringToBase64', 'llBase64ToInteger', 'llIntegerToBase64',
  'llSHA1String', 'llMD5String', 'llXorBase64', 'llChar', 'llOrd', 'llHash', 'llGenerateKey',
  'llLinksetDataRead', 'llLinksetDataWrite', 'llLinksetDataDelete', 'llLinksetDataListKeys',
  'llLinksetDataCountKeys', 'llLinksetDataAvailable', 'llLinksetDataReset',
  // Math, Vector & Rotation
  'llAbs', 'llFabs', 'llFloor', 'llCeil', 'llRound', 'llSqrt', 'llPow', 'llLog', 'llLog10', 'llExp', 'llModPow',
  'llSin', 'llCos', 'llTan', 'llAsin', 'llAcos', 'llAtan2', 'llFrand',
  'llVecMag', 'llVecNorm', 'llVecDist', 'llRotBetween', 'llRot2Axis', 'llRot2Angle', 'llAxisAngle2Rot',
  'llEuler2Rot', 'llRot2Euler', 'llRot2Fwd', 'llRot2Left', 'llRot2Up', 'llAngleBetween', 'llAxes2Rot',
];

export const OFFICIAL_LSL_FUNCTION_SET = new Set<string>(OFFICIAL_LSL_FUNCTIONS_LIST);
