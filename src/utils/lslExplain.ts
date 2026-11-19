/** Plain-language explanation used when no model is available, and as the explain-mode baseline. */
export function explainLslSelection(code: string): string {
  const src = String(code || '').replace(/```[\w]*\n?/g, '').trim();
  if (!src) return 'Select some LSL and I will explain what those lines do.';
  const events = [...src.matchAll(/\b(state_entry|state_exit|touch_start|touch_end|touch|listen|timer|sensor|no_sensor|changed|on_rez|attach|money|dataserver|http_response|http_request|link_message|collision_start|control|run_time_permissions)\s*\(/g)].map((m) => m[1]);
  const calls = [...src.matchAll(/\b(ll[A-Z][A-Za-z0-9_]*)\s*\(/g)].map((m) => m[1]);
  const uniq = (list: string[]) => [...new Set(list)];
  const states = [...src.matchAll(/\bstate\s+([A-Za-z_]\w*)/g)].map((m) => m[1]);
  const lines = src.split('\n');
  const parts: string[] = [];
  parts.push(`This selection is ${lines.length} line${lines.length === 1 ? '' : 's'} of Linden Scripting Language (LSL), the language Second Life uses inside objects.`);
  if (/\bdefault\b/.test(src)) {
    parts.push('The default state is where the script starts after a reset. Named states, if any, are separate modes the script can jump to with a state change.');
  }
  if (states.length) parts.push(`Named states here: ${uniq(states).join(', ')}.`);
  if (events.length) {
    const gloss: Record<string, string> = {
      state_entry: 'runs once when the state starts',
      touch_start: 'runs when an avatar begins a click',
      listen: 'runs when chat arrives on a channel the script opened',
      timer: 'runs on the schedule set by llSetTimerEvent',
      sensor: 'runs when a scan finds avatars or objects',
      changed: 'runs when the object changes, including a new owner',
      on_rez: 'runs when the object is rezzed',
      dataserver: 'runs when a notecard or data request returns',
      http_response: 'runs when an llHTTPRequest finishes',
      money: 'runs when someone pays the object',
      attach: 'runs when the object is worn or detached',
    };
    const described = uniq(events).map((name) => `${name} (${gloss[name] || 'an LSL event'})`);
    parts.push(`Events: ${described.join('; ')}.`);
  }
  if (calls.length) {
    parts.push(`Library calls: ${uniq(calls).slice(0, 12).join(', ')}. Each ll* function has a fixed argument list, and a wrong count is a compile error.`);
  }
  if (/\bllListen\s*\(/.test(src)) {
    parts.push('llListen opens a chat handle. The matching llListenRemove drops that handle so the script does not leak listens.');
  }
  if (/\bllSetTimerEvent\s*\(/.test(src)) {
    parts.push('llSetTimerEvent arms a repeating timer. Passing 0.0 stops it.');
  }
  parts.push('LSL needs a semicolon after every statement, variables declared before use, and types integer, float, string, key, vector, rotation, and list. A script must stay under the 64 KB Mono memory limit.');
  return parts.join('\n\n');
}
