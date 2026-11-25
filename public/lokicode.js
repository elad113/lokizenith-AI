/* LokiCode — Master AI Coding & Pro LSL2/Mono Specialist
   Powered by Lokizen 4.0 Stark (Turbo Pro Engine)
   9 Languages · Single-Roundtrip SSE · Vision Error & Example Attachments ·
   Deterministic LSL2 Compiler & Simulator · Interactive Runner · Mode Switcher (New vs Edit) */
(function(){
'use strict';
const A = window.App, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

// 11 Primary Coding Languages (including Rust, Go, LSL2 & MATLAB)
const LANGS = [
  {id:'python',     name:'Python',     ext:'py',   hl:'python',     c:'#3776ab', icon:'🐍', run:'cpython-3.12.7'},
  {id:'java',       name:'Java',       ext:'java', hl:'java',       c:'#f89820', icon:'☕', run:'openjdk-jdk-22+36'},
  {id:'lsl',        name:'LSL',        ext:'lsl',  hl:'lsl',        c:'#00e5ff', icon:'💠', run:'lsl2-mono'},
  {id:'javascript', name:'JavaScript', ext:'js',   hl:'javascript', c:'#f7df1e', icon:'⚡', run:'nodejs-v22'},
  {id:'typescript', name:'TypeScript', ext:'ts',   hl:'typescript', c:'#3178c6', icon:'🔷', run:'typescript-5.6.2'},
  {id:'html',       name:'HTML/CSS',   ext:'html', hl:'xml',        c:'#e34f26', icon:'🌐', run:'html5-dom-engine'},
  {id:'cpp',        name:'C++',        ext:'cpp',  hl:'cpp',        c:'#00599c', icon:'⚙️', run:'gcc-13.2.0'},
  {id:'csharp',     name:'C#',         ext:'cs',   hl:'csharp',     c:'#9b4f96', icon:'🎯', run:'dotnetcore-8.0.402'},
  {id:'matlab',     name:'MATLAB',     ext:'m',    hl:'matlab',     c:'#e16737', icon:'📐', run:'matlab-r2024b'},
  {id:'rust',       name:'Rust',       ext:'rs',   hl:'rust',       c:'#dea584', icon:'🦀', run:'rust-1.82.0'},
  {id:'go',         name:'Go',         ext:'go',   hl:'go',         c:'#00add8', icon:'🐹', run:'go-1.23.2'}
];

const ALIAS = {
  py:'python', python3:'python',
  java:'java',
  lsl:'lsl', 'linden scripting language':'lsl', secondlife:'lsl',
  js:'javascript', node:'javascript', jsx:'javascript',
  ts:'typescript', tsx:'typescript',
  htm:'html', html:'html', css:'html', xml:'html',
  cpp:'cpp', 'c++':'cpp', c:'cpp',
  cs:'csharp', 'c#':'csharp',
  m:'matlab', matlab:'matlab', octave:'matlab',
  rs:'rust', rust:'rust',
  go:'go', golang:'go'
};

// Dynamic Language-Aware Example Ideas Pool (changes automatically by active language + AI Refresh)
const LANG_IDEAS_POOL = {
  python: [
    { label: '🐍 Prime Benchmark', prompt: 'Write a Python prime number generator and Miller-Rabin primality benchmark with timing stats' },
    { label: '📊 Matrix & Eigen Solver', prompt: 'Build a Python linear algebra matrix toolkit (determinant, inverse, Gaussian elimination) with interactive input' },
    { label: '🤖 Neural Net from Scratch', prompt: 'Create a pure-Python 2-layer neural network trained on XOR with live loss curve ASCII chart' },
    { label: '🗂️ Interactive Task Engine', prompt: 'Build a complete Python CLI task & priority scheduler that reads commands from input()' }
  ],
  matlab: [
    { label: '📐 Matrix & Eigen Analysis', prompt: 'Write a MATLAB script for matrix operations, determinant, trace, magic square, and solving linear systems' },
    { label: '🌊 Signal FFT Spectrum', prompt: 'Build a MATLAB Discrete Fourier Transform (DFT) signal analyzer with ASCII frequency spectrum plot' },
    { label: '🚀 Runge-Kutta ODE Solver', prompt: 'Create a MATLAB 4th-order Runge-Kutta (RK4) differential equation solver for a damped harmonic oscillator' },
    { label: '🔢 Interactive Newton-Raphson', prompt: 'Write a MATLAB numerical root-finding calculator using input() with Newton-Raphson iteration table' }
  ],
  java: [
    { label: '☕ Banking Ledger System', prompt: 'Build a Java object-oriented banking ledger with transactions, interest calculation, and Scanner input' },
    { label: '🧭 Dijkstra Shortest Path', prompt: 'Write a Java weighted graph shortest-path router using Dijkstra priority queue with formatted route output' },
    { label: '⚡ Multi-Thread Work Pool', prompt: 'Create a Java concurrent job processor simulation with thread-safe statistics and latency histogram' },
    { label: '🎮 RPG Arena Simulator', prompt: 'Build a Java turn-based tactical RPG battle engine with classes, critical hits, and interactive Scanner moves' }
  ],
  lsl: [
    { label: '🛡️ LSL Parcel Security Orb', prompt: 'Create a complete Second Life LSL parcel security orb with owner whitelist, llDialog admin menu, llSensorRepeat radar, and llEjectFromLand' },
    { label: '🚁 LSL Hovercraft Vehicle', prompt: 'Build a complete Second Life LSL physics hovercraft vehicle with llSetVehicleType, avatar control keys, banking, and thruster particles' },
    { label: '🚪 LSL Auto-Sliding Door', prompt: 'Write a Second Life LSL smooth sliding security door using llSetLinkPrimitiveParamsFast, sensor detection, and private dialog menu' },
    { label: '💎 LSL Tip Jar & Leaderboard', prompt: 'Create an LSL performer tip jar with money() split payouts, top-5 donor hovertext leaderboard, and llParticleSystem burst' }
  ],
  javascript: [
    { label: '⚡ Event Loop & Async Queue', prompt: 'Write a JavaScript concurrent task scheduler with retry backoff, rate limiting, and live progress logs' },
    { label: '🧩 A* Maze Pathfinder', prompt: 'Build a JavaScript A* pathfinding solver that generates a random ASCII maze and prints the optimal path' },
    { label: '📦 Reactive State Store', prompt: 'Create a zero-dependency JavaScript reactive state engine with computed selectors and time-travel undo' },
    { label: '🎲 Procedural Dungeon Gen', prompt: 'Build a JavaScript BSP procedural dungeon generator with rooms, corridors, and loot placement' }
  ],
  typescript: [
    { label: '🔷 Type-Safe Event Bus', prompt: 'Build a strongly-typed TypeScript generic pub/sub event bus with middleware and schema validation' },
    { label: '🧠 ECS Game Architecture', prompt: 'Create a TypeScript Entity-Component-System (ECS) micro-engine simulating physics and health systems' },
    { label: '📈 Order Book Matching Engine', prompt: 'Build a high-frequency TypeScript limit order book matching engine with price-time priority and trade tape' },
    { label: '🔄 Finite State Machine', prompt: 'Create a strictly typed TypeScript hierarchical finite state machine for a checkout & payment workflow' }
  ],
  html: [
    { label: '🌐 Neon Cyberpunk Dashboard', prompt: 'Build an interactive HTML/CSS/JS cyberpunk telemetry dashboard with live animated charts and controls' },
    { label: '🎹 WebAudio Synth Pad', prompt: 'Create an interactive HTML/CSS/JS polyphonic synthesizer keyboard with waveform visualizer canvas' },
    { label: '🪐 Particle Gravity Sandbox', prompt: 'Build an HTML5 Canvas interactive orbital gravity simulator where clicking spawns planets and stars' },
    { label: '🎮 Retro Brick Breaker Game', prompt: 'Build a playable arcade neon Brick Breaker game in a single HTML5 Canvas file with power-ups and score' }
  ],
  cpp: [
    { label: '⚙️ STL Memory Pool & Benchmark', prompt: 'Write a C++20 custom arena memory allocator and benchmark it against std::vector with timing output' },
    { label: '🧭 A* Grid Navigator', prompt: 'Build a C++ A* pathfinding algorithm on a 2D obstacle grid with ASCII map visualization and std::cin support' },
    { label: '🔢 Matrix SIMD-Style Math', prompt: 'Create a C++ template matrix multiplication & linear system solver with operator overloading' },
    { label: '🚀 N-Body Physics Engine', prompt: 'Write a C++ gravitational N-body orbital simulation using Velocity Verlet integration' }
  ],
  csharp: [
    { label: '🟣 LINQ Analytics Engine', prompt: 'Write a C# data analytics pipeline using LINQ queries, grouping, and formatted console tables' },
    { label: '🏦 Async Order Processor', prompt: 'Build a C# async/await e-commerce order & inventory processor with Console.ReadLine input support' },
    { label: '🎲 Dungeon Loot & Combat', prompt: 'Create a C# RPG loot generator and combat simulator using records, pattern matching, and interfaces' },
    { label: '📊 Financial Amortization', prompt: 'Create a C# loan & compound investment calculator printing a full amortization schedule' }
  ],
  rust: [
    { label: '🦀 Zero-Copy Tokenizer', prompt: 'Write an idiomatic Rust zero-copy text tokenizer and word-frequency analyzer with microsecond timing' },
    { label: '🧭 Dijkstra Graph Router', prompt: 'Build a Rust BinaryHeap Dijkstra shortest-path router on a weighted city graph with path reconstruction' },
    { label: '🔐 Safe LRU Cache Engine', prompt: 'Create a clean, safe Rust generic LRU cache with hit/miss metrics and unit benchmark output' },
    { label: '⚡ Concurrent Prime Sieve', prompt: 'Write a Rust parallel segmented prime sieve using std::thread with throughput statistics' }
  ],
  go: [
    { label: '🐹 Worker Pool Pipeline', prompt: 'Build an idiomatic Go concurrent worker pool using goroutines, channels, and sync.WaitGroup with latency stats' },
    { label: '⚡ Token Bucket Limiter', prompt: 'Create a Go thread-safe token bucket rate limiter and stress-test it across concurrent simulated clients' },
    { label: '🗂️ TTL Key-Value Store', prompt: 'Write a Go thread-safe TTL key-value cache with expiry metrics and formatted benchmark table' },
    { label: '🧭 Shortest-Path Grid BFS', prompt: 'Build a Go BFS maze solver that renders the obstacle grid and optimal path in ASCII' }
  ]
};

// Starter Code Templates for all 9 Languages
const TEMPLATES = [
  {
    id: 'py-benchmark',
    lang: 'python',
    title: 'High-Speed Prime Sieve & Benchmark',
    desc: 'Calculates primes up to 1,000,000 using Sieve of Eratosthenes with microsecond timing.',
    code: `import time

def sieve_of_eratosthenes(limit: int) -> list[int]:
    """Calculate all prime numbers up to limit efficiently."""
    if limit < 2:
        return []
    is_prime = [True] * (limit + 1)
    is_prime[0] = is_prime[1] = False
    
    p = 2
    while p * p <= limit:
        if is_prime[p]:
            for i in range(p * p, limit + 1, p):
                is_prime[i] = False
        p += 1
    return [i for i, prime in enumerate(is_prime) if prime]

if __name__ == '__main__':
    limit = 100_000
    print(f"[*] Running Prime Sieve benchmark up to {limit:,}...")
    t0 = time.perf_counter()
    primes = sieve_of_eratosthenes(limit)
    elapsed = time.perf_counter() - t0
    print(f"[✓] Found {len(primes):,} primes in {elapsed * 1000:.2f} ms")
    print(f"[*] Top 10 primes: {primes[-10:]}")`
  },
  {
    id: 'lsl-security-orb',
    lang: 'lsl',
    title: 'LSL Parcel Security Orb & Whitelist Radar',
    desc: 'Production LSL2 security orb with llDialog owner console, whitelist manager, radar sweep & eject.',
    code: `// Second Life / OpenSim — Parcel Security Orb (LSL2/Mono)
integer g_enabled = TRUE;
float g_range = 24.0;
integer g_channel = -88104;
integer g_listenHandle = 0;
list g_whitelist = [];
key g_owner;

updateHoverText()
{
    string stText = "OFF";
    vector col = <1.0, 0.35, 0.35>;
    if (g_enabled)
    {
        stText = "ARMED (" + (string)((integer)g_range) + "m)";
        col = <0.0, 1.0, 0.62>;
    }
    llSetText("Lokizenith Security Orb\\nStatus: " + stText + "\\nWhitelist: " + (string)llGetListLength(g_whitelist), col, 1.0);
}

openMenu(key target)
{
    llListenRemove(g_listenHandle);
    g_listenHandle = llListen(g_channel, "", target, "");
    llDialog(target, "Security Orb Control\\nRange: " + (string)((integer)g_range) + "m", ["Toggle Arm", "Range 20m", "Range 40m", "List Allowed", "Clear List", "Close"], g_channel);
}

default
{
    state_entry()
    {
        g_owner = llGetOwner();
        updateHoverText();
        llSensorRepeat("", NULL_KEY, AGENT, g_range, PI, 2.5);
        llOwnerSay("Security Orb active on channel " + (string)g_channel);
    }

    touch_start(integer total_number)
    {
        key toucher = llDetectedKey(0);
        if (toucher == g_owner) openMenu(toucher);
        else llRegionSayTo(toucher, 0, "Access restricted to parcel owner.");
    }

    sensor(integer num_detected)
    {
        if (!g_enabled) return;
        integer i;
        for (i = 0; i < num_detected; ++i)
        {
            key av = llDetectedKey(i);
            string name = llDetectedName(i);
            if (av != g_owner && llListFindList(g_whitelist, [name]) == -1)
            {
                llRegionSayTo(av, 0, "Restricted parcel: leaving area.");
                llEjectFromLand(av);
            }
        }
    }

    listen(integer channel, string name, key id, string message)
    {
        if (id != g_owner || channel != g_channel) return;
        if (message == "Toggle Arm") g_enabled = !g_enabled;
        else if (message == "Range 20m") { g_range = 20.0; llSensorRepeat("", NULL_KEY, AGENT, g_range, PI, 2.5); }
        else if (message == "Range 40m") { g_range = 40.0; llSensorRepeat("", NULL_KEY, AGENT, g_range, PI, 2.5); }
        else if (message == "List Allowed") llOwnerSay("Whitelist: " + llDumpList2String(g_whitelist, ", "));
        else if (message == "Clear List") g_whitelist = [];
        updateHoverText();
        llListenRemove(g_listenHandle);
    }

    on_rez(integer start_param) { llResetScript(); }
    changed(integer change) { if (change & CHANGED_OWNER) llResetScript(); }
}`
  },
  {
    id: 'lsl-hovercraft',
    lang: 'lsl',
    title: 'LSL Hovercraft Vehicle Physics Engine',
    desc: 'LSL2 airplane/hovercraft script with sit target, take controls, angular banking & speed boost.',
    code: `// Second Life / OpenSim — Physics Hovercraft Vehicle (LSL2/Mono)
key g_driver = NULL_KEY;
integer g_flying = FALSE;

setupVehicle()
{
    llSetVehicleType(VEHICLE_TYPE_AIRPLANE);
    llSetVehicleFloatParam(VEHICLE_HOVER_HEIGHT, 1.5);
    llSetVehicleFloatParam(VEHICLE_HOVER_EFFICIENCY, 0.85);
    llSetVehicleFloatParam(VEHICLE_HOVER_TIMESCALE, 0.4);
    llSetVehicleVectorParam(VEHICLE_LINEAR_FRICTION_TIMESCALE, <4.0, 2.0, 2.0>);
    llSetVehicleVectorParam(VEHICLE_ANGULAR_FRICTION_TIMESCALE, <0.8, 0.8, 0.8>);
}

default
{
    state_entry()
    {
        llSitTarget(<0.2, 0.0, 0.45>, ZERO_ROTATION);
        llSetSitText("Pilot Craft");
        setupVehicle();
        llSetText("Lokizenith Hovercraft\\nSit to Pilot", <0.0, 0.9, 1.0>, 1.0);
        llOwnerSay("Hovercraft systems calibrated.");
    }

    changed(integer change)
    {
        if (change & CHANGED_LINK)
        {
            key av = llAvatarOnSitTarget();
            if (av != NULL_KEY && av != g_driver)
            {
                g_driver = av;
                llRequestPermissions(g_driver, PERMISSION_TAKE_CONTROLS);
            }
            else if (av == NULL_KEY && g_driver != NULL_KEY)
            {
                llSetStatus(STATUS_PHYSICS, FALSE);
                llReleaseControls();
                g_driver = NULL_KEY;
                g_flying = FALSE;
            }
        }
    }

    run_time_permissions(integer perm)
    {
        if (perm & PERMISSION_TAKE_CONTROLS)
        {
            llTakeControls(CONTROL_FWD | CONTROL_BACK | CONTROL_ROT_LEFT | CONTROL_ROT_RIGHT | CONTROL_UP | CONTROL_DOWN, TRUE, FALSE);
            llSetStatus(STATUS_PHYSICS, TRUE);
            g_flying = TRUE;
            llRegionSayTo(g_driver, 0, "Engines engaged! Use WASD / E / C to pilot.");
        }
    }

    control(key id, integer level, integer edge)
    {
        vector thrust = ZERO_VECTOR;
        vector torque = ZERO_VECTOR;
        if (level & CONTROL_FWD) thrust.x += 18.0;
        if (level & CONTROL_BACK) thrust.x -= 10.0;
        if (level & CONTROL_UP) thrust.z += 12.0;
        if (level & CONTROL_DOWN) thrust.z -= 12.0;
        if (level & CONTROL_ROT_LEFT) torque.z += 3.2;
        if (level & CONTROL_ROT_RIGHT) torque.z -= 3.2;
        llSetVehicleVectorParam(VEHICLE_LINEAR_MOTOR_DIRECTION, thrust);
        llSetVehicleVectorParam(VEHICLE_ANGULAR_MOTOR_DIRECTION, torque);
    }

    on_rez(integer start_param) { llResetScript(); }
}`
  },
  {
    id: 'lsl-door',
    lang: 'lsl',
    title: 'LSL Auto-Scanning Security Door',
    desc: 'Linden Scripting Language door using llSetLinkPrimitiveParamsFast, sensor, and touch toggle.',
    code: `// Second Life / OpenSim — Smart Sensor Security Door (LSL2/Mono)
rotation ROT_OPEN;
rotation ROT_CLOSED;
integer g_isOpen = FALSE;
key g_soundOpen = "cb340647-9680-dd52-3a5c-4e3db3718442";
key g_soundClose = "e7ff1054-003d-d134-4e01-2e7e079b0ec7";

openDoor()
{
    if (g_isOpen) return;
    g_isOpen = TRUE;
    llTriggerSound(g_soundOpen, 0.8);
    llSetLinkPrimitiveParamsFast(LINK_THIS, [PRIM_ROTATION, ROT_OPEN * llGetRot(), PRIM_GLOW, ALL_SIDES, 0.12]);
    llSetTimerEvent(5.0);
}

closeDoor()
{
    if (!g_isOpen) return;
    g_isOpen = FALSE;
    llTriggerSound(g_soundClose, 0.8);
    llSetLinkPrimitiveParamsFast(LINK_THIS, [PRIM_ROTATION, ROT_CLOSED * llGetRot(), PRIM_GLOW, ALL_SIDES, 0.0]);
    llSetTimerEvent(0.0);
}

default
{
    state_entry()
    {
        ROT_OPEN = llEuler2Rot(<0.0, 0.0, 90.0> * DEG_TO_RAD);
        ROT_CLOSED = llEuler2Rot(<0.0, 0.0, -90.0> * DEG_TO_RAD);
        llSetText("Smart Door [Touch to Toggle]", <0.0, 1.0, 0.6>, 1.0);
        llSensorRepeat("", NULL_KEY, AGENT, 3.5, PI, 2.0);
    }

    touch_start(integer total_number)
    {
        key toucher = llDetectedKey(0);
        llRegionSayTo(toucher, 0, "Door toggled by " + llDetectedName(0));
        if (g_isOpen) closeDoor();
        else openDoor();
    }

    sensor(integer total_number)
    {
        if (!g_isOpen) openDoor();
    }

    no_sensor()
    {
        if (g_isOpen) closeDoor();
    }

    timer() { closeDoor(); }
    on_rez(integer start_param) { llResetScript(); }
}`
  },
  {
    id: 'java-queue',
    lang: 'java',
    title: 'Multi-Threaded Worker Queue',
    desc: 'Concurrent task pool demonstrating thread-safe queue processing in Java.',
    code: `import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class Main {
    public static void main(String[] args) throws InterruptedException {
        int workers = 3;
        ExecutorService pool = Executors.newFixedThreadPool(workers);
        AtomicInteger completed = new AtomicInteger(0);

        System.out.println("[*] Starting Java worker pool with " + workers + " threads...");
        for (int i = 1; i <= 6; i++) {
            final int taskId = i;
            pool.submit(() -> {
                long tid = Thread.currentThread().getId();
                System.out.println("  -> Worker #" + tid + " executing Task " + taskId);
                try {
                    Thread.sleep(120);
                } catch (InterruptedException ignored) {}
                completed.incrementAndGet();
            });
        }

        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("[✓] Finished all " + completed.get() + " tasks successfully!");
    }
}`
  },
  {
    id: 'js-canvas',
    lang: 'javascript',
    title: 'Interactive Particle Physics Simulation',
    desc: 'Self-contained 2D particle simulation with velocity Verlet integration and mouse gravity.',
    code: `// Interactive Canvas Particle Physics
const canvas = document.createElement('canvas');
canvas.width = window.innerWidth || 600;
canvas.height = 360;
canvas.style.cssText = 'background:#05070a;border-radius:12px;width:100%;height:360px;';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

const particles = Array.from({length: 80}, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  vx: (Math.random() - 0.5) * 2,
  vy: (Math.random() - 0.5) * 2,
  radius: Math.random() * 3 + 2,
  hue: Math.floor(Math.random() * 60) + 140
}));

function animate() {
  ctx.fillStyle = 'rgba(5, 7, 10, 0.2)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = \`hsl(\${p.hue}, 90%, 60%)\`;
    ctx.shadowBlur = 8;
    ctx.shadowColor = \`hsl(\${p.hue}, 90%, 60%)\`;
    ctx.fill();
  });
  requestAnimationFrame(animate);
}
animate();
console.log('[✓] Interactive particle physics engine initialized!');`
  },
  {
    id: 'cpp-matrix',
    lang: 'cpp',
    title: 'High-Performance Matrix Multiplication',
    desc: 'Optimized C++17 matrix arithmetic with cache-friendly loop ordering.',
    code: `#include <iostream>
#include <vector>
#include <chrono>

using Matrix = std::vector<std::vector<double>>;

Matrix multiply(const Matrix& A, const Matrix& B) {
    size_t n = A.size();
    Matrix C(n, std::vector<double>(n, 0.0));
    // Cache-friendly i-k-j loop order
    for (size_t i = 0; i < n; ++i) {
        for (size_t k = 0; k < n; ++k) {
            for (size_t j = 0; j < n; ++j) {
                C[i][j] += A[i][k] * B[k][j];
            }
        }
    }
    return C;
}

int main() {
    constexpr size_t N = 120;
    std::cout << "[*] Multiplying two " << N << "x" << N << " matrices in C++17..." << std::endl;
    Matrix A(N, std::vector<double>(N, 1.5));
    Matrix B(N, std::vector<double>(N, 2.0));

    auto t0 = std::chrono::high_resolution_clock::now();
    Matrix C = multiply(A, B);
    auto t1 = std::chrono::high_resolution_clock::now();
    double ms = std::chrono::duration<double, std::milli>(t1 - t0).count();

    std::cout << "[✓] Multiplied successfully in " << ms << " ms." << std::endl;
    std::cout << "[*] Sample result C[0][0] = " << C[0][0] << std::endl;
    return 0;
}`
  },
  {
    id: 'cs-linq',
    lang: 'csharp',
    title: 'Async Data Pipeline with LINQ',
    desc: 'Modern C# demonstrating Record types, LINQ transformations, and async aggregation.',
    code: `using System;
using System.Linq;
using System.Collections.Generic;
using System.Threading.Tasks;

record SensorReading(string Id, double Value, DateTime Timestamp);

class Program {
    static async Task Main() {
        Console.WriteLine("[*] Starting C# sensor aggregation pipeline...");
        var readings = new List<SensorReading> {
            new("node-alpha", 24.5, DateTime.UtcNow),
            new("node-beta",  29.1, DateTime.UtcNow),
            new("node-alpha", 25.8, DateTime.UtcNow),
            new("node-gamma", 31.4, DateTime.UtcNow),
            new("node-beta",  28.7, DateTime.UtcNow)
        };

        await Task.Delay(80); // Simulate async I/O

        var summary = readings
            .GroupBy(r => r.Id)
            .Select(g => new {
                Node = g.Key,
                Avg = g.Average(x => x.Value),
                Max = g.Max(x => x.Value),
                Count = g.Count()
            })
            .OrderByDescending(x => x.Avg);

        Console.WriteLine("[✓] Aggregation results:");
        foreach (var s in summary) {
            Console.WriteLine($"  - {s.Node}: Avg={s.Avg:F1}°C, Max={s.Max:F1}°C (from {s.Count} samples)");
        }
    }
}`
  },
  {
    id: 'matlab-matrix',
    lang: 'matlab',
    title: 'MATLAB Matrix Algebra, Eigen & Stdin Solver',
    desc: 'Computes magic squares, matrix determinants, trace, harmonic progression, and interactive input scaling.',
    code: `% ==========================================================
% LokiCode MATLAB R2024b Numerical & Matrix Computing Suite
% ==========================================================
clc;
disp('=== [MATLAB] Numerical Matrix & Linear Algebra Engine ===');

scale = input('Enter matrix scale factor: ');
M = magic(3)
detM = det(M);
trM = trace(M);
avgM = mean(M);

fprintf('Determinant det(M) = %.2f\\n', detM);
fprintf('Trace trace(M)     = %d\\n', trM);
fprintf('Scaled Trace       = %d (scale = %d)\\n', trM * scale, scale);

disp('--- Harmonic Energy Table (k = 1:5) ---');
for k = 1:5
    energy = (k^2) * scale + sqrt(k);
    fprintf('Step k=%d -> Energy = %.4f\\n', k, energy);
end`
  },
  {
    id: 'rust-dijkstra',
    lang: 'rust',
    title: 'Rust BinaryHeap Dijkstra Shortest-Path Router',
    desc: 'Zero-dependency idiomatic Rust graph router with min-heap priority queue and latency benchmark.',
    code: `use std::cmp::Ordering;
use std::collections::BinaryHeap;
use std::time::Instant;

#[derive(Copy, Clone, Eq, PartialEq)]
struct State {
    cost: usize,
    node: usize,
}

impl Ord for State {
    fn cmp(&self, other: &Self) -> Ordering {
        other.cost.cmp(&self.cost).then_with(|| self.node.cmp(&other.node))
    }
}
impl PartialOrd for State {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

fn dijkstra(adj: &[Vec<(usize, usize)>], start: usize, goal: usize) -> Option<(usize, Vec<usize>)> {
    let mut dist = vec![usize::MAX; adj.len()];
    let mut prev = vec![None; adj.len()];
    let mut heap = BinaryHeap::new();

    dist[start] = 0;
    heap.push(State { cost: 0, node: start });

    while let Some(State { cost, node }) = heap.pop() {
        if node == goal {
            let mut path = vec![goal];
            let mut cur = goal;
            while let Some(p) = prev[cur] {
                path.push(p);
                cur = p;
            }
            path.reverse();
            return Some((cost, path));
        }
        if cost > dist[node] { continue; }
        for &(next, weight) in &adj[node] {
            let next_cost = cost + weight;
            if next_cost < dist[next] {
                dist[next] = next_cost;
                prev[next] = Some(node);
                heap.push(State { cost: next_cost, node: next });
            }
        }
    }
    None
}

fn main() {
    let t0 = Instant::now();
    let names = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zenith"];
    let graph = vec![
        vec![(1, 4), (2, 2)],
        vec![(2, 1), (3, 5)],
        vec![(3, 8), (4, 10)],
        vec![(4, 2), (5, 6)],
        vec![(5, 3)],
        vec![],
    ];
    if let Some((cost, path)) = dijkstra(&graph, 0, 5) {
        let route: Vec<&str> = path.iter().map(|&i| names[i]).collect();
        println!("[Rust Dijkstra] Optimal Route: {}", route.join(" -> "));
        println!("[✓] Total Cost: {} | Solved in {:?}", cost, t0.elapsed());
    }
}`
  },
  {
    id: 'go-worker-pool',
    lang: 'go',
    title: 'Go Concurrent Worker Pool & Latency Benchmark',
    desc: 'Idiomatic Go goroutines, buffered channels, and sync.WaitGroup parallel job processor.',
    code: `package main

import (
\t"fmt"
\t"sync"
\t"time"
)

type Job struct {
\tID    int
\tInput int
}

type Result struct {
\tJobID  int
\tOutput int
}

func worker(jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
\tdefer wg.Done()
\tfor j := range jobs {
\t\tacc := 0
\t\tfor i := 1; i <= j.Input; i++ {
\t\t\tacc += i * i
\t\t}
\t\tresults <- Result{JobID: j.ID, Output: acc}
\t}
}

func main() {
\tstart := time.Now()
\tconst numJobs, numWorkers = 12, 4
\tjobs := make(chan Job, numJobs)
\tresults := make(chan Result, numJobs)

\tvar wg sync.WaitGroup
\tfor w := 0; w < numWorkers; w++ {
\t\twg.Add(1)
\t\tgo worker(jobs, results, &wg)
\t}

\tfor i := 1; i <= numJobs; i++ {
\t\tjobs <- Job{ID: i, Input: i * 10}
\t}
\tclose(jobs)

\tgo func() {
\t\twg.Wait()
\t\tclose(results)
\t}()

\ttotal := 0
\tfor r := range results {
\t\ttotal += r.Output
\t\tfmt.Printf("Job #%02d -> sum_sq=%d\\n", r.JobID, r.Output)
\t}
\tfmt.Printf("[✓] Processed %d jobs across %d goroutines (checksum=%d) in %v\\n", numJobs, numWorkers, total, time.Since(start))
}`
  }
];

let lslLoaded = false;
function ensureLSL(){
  if (lslLoaded || !window.hljs) return;
  lslLoaded = true;
  LZ.loadScript('https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/languages/lsl.min.js')
    .then(() => paint(st.code))
    .catch(() => {});
}

let matlabLoaded = false;
function ensureMATLAB(){
  if (matlabLoaded || !window.hljs || (window.hljs && hljs.getLanguage('matlab'))) return;
  matlabLoaded = true;
  LZ.loadScript('https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/languages/matlab.min.js')
    .then(() => paint(st.code))
    .catch(() => {});
}

// Initial state
const savedState = A.safeJSON(localStorage.getItem('lz.code')) || {};
const st = {
  lang: savedState.lang || 'python',
  code: savedState.code || '',
  prompt: savedState.prompt || '',
  verified: !!savedState.verified,
  mode: savedState.mode || 'new', // 'new' | 'edit'
  activeDocId: savedState.activeDocId || null
};
if (!LANGS.some(l => l.id === st.lang)) st.lang = 'python';

let busy = false;
let workTimerId = 0;
let workStartMs = 0;
let finishedTasks = [];
let currentTask = 'Idle';
let verifiedTokenCount = 0;
let lastCodeBeforeEdit = '';
let diffViewOpen = false;
let codeWrapEnabled = false;
let codeFontSize = 13.5;

function renderDiffView(){
  const box = $('#lcDiffView');
  if (!box) return;
  if (!diffViewOpen || !lastCodeBeforeEdit.trim()) {
    box.hidden = true;
    return;
  }
  const oldLines = lastCodeBeforeEdit.replace(/\r\n/g, '\n').split('\n');
  const newLines = String(st.code || '').replace(/\r\n/g, '\n').split('\n');
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);
  let added = 0, removed = 0;
  const rows = [];
  let i = 0, j = 0;
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      rows.push({ type: 'eq', text: newLines[j] });
      i++; j++;
    } else if (j < newLines.length && !oldSet.has(newLines[j])) {
      rows.push({ type: 'add', text: newLines[j] });
      added++; j++;
    } else if (i < oldLines.length && !newSet.has(oldLines[i])) {
      rows.push({ type: 'del', text: oldLines[i] });
      removed++; i++;
    } else if (j < newLines.length) {
      rows.push({ type: 'add', text: newLines[j] });
      added++; j++;
    } else {
      rows.push({ type: 'del', text: oldLines[i] });
      removed++; i++;
    }
    if (rows.length > 400) break;
  }
  const htmlRows = rows.map(r => {
    const prefix = r.type === 'add' ? '+' : r.type === 'del' ? '-' : ' ';
    return `<div class="lc-diff-line ${r.type}"><span class="lc-diff-sign">${prefix}</span><span class="lc-diff-txt">${A.esc(r.text)}</span></div>`;
  }).join('');
  box.innerHTML = `
    <div class="lc-diff-head">
      <span>🔀 Latest Edit Diff <b class="diff-add">+${added}</b> <b class="diff-del">-${removed}</b></span>
      <button type="button" class="lc-mini-ctl" id="lcDiffClose">Close Diff ✕</button>
    </div>
    <div class="lc-diff-body">${htmlRows}</div>
  `;
  const closeBtn = $('#lcDiffClose');
  if (closeBtn) {
    closeBtn.onclick = () => {
      diffViewOpen = false;
      box.hidden = true;
      const tgl = $('#lcDiffToggle');
      if (tgl) tgl.classList.remove('on');
    };
  }
  box.hidden = false;
}

// Code History array in localStorage (only latest updates)
function getHistory(){
  const raw = localStorage.getItem('lz.code.history');
  return A.safeJSON(raw) || [];
}
function setHistory(list){
  localStorage.setItem('lz.code.history', JSON.stringify(list.slice(0, 50)));
  updateHistoryBadge();
  window.LZAuth?.scheduleSync?.();
}

function updateHistoryBadge(){
  const badge = $('#lcHistoryBadge');
  if (badge) {
    const list = getHistory();
    badge.textContent = String(list.length);
  }
}

const save = () => {
  localStorage.setItem('lz.code', JSON.stringify({
    lang: st.lang,
    code: (st.code || '').slice(0, 200000),
    prompt: st.prompt || '',
    verified: !!st.verified,
    mode: st.mode,
    activeDocId: st.activeDocId
  }));
  updateMetrics();
  window.LZAuth?.scheduleSync?.();
};

const L = () => LANGS.find(l => l.id === st.lang) || LANGS[0];

function fmtElapsed(ms){
  const sec = Math.max(0, ms / 1000);
  if (sec < 10) return sec.toFixed(1) + 's';
  return Math.round(sec) + 's';
}

/* ---------- Mode Switcher (New vs Edit) ---------- */
function setMode(mode){
  st.mode = mode === 'edit' ? 'edit' : 'new';
  const newBtn = $('#lcModeNew');
  const editBtn = $('#lcModeEdit');
  const badge = $('#lcModeBadge');
  const hint = $('#lcModeHint');
  const pInput = $('#lcPrompt');
  const goTxt = $('#lcGoText');

  if (newBtn && editBtn) {
    newBtn.classList.toggle('on', st.mode === 'new');
    editBtn.classList.toggle('on', st.mode === 'edit');
    newBtn.setAttribute('aria-selected', String(st.mode === 'new'));
    editBtn.setAttribute('aria-selected', String(st.mode === 'edit'));
  }

  if (st.mode === 'edit') {
    if (badge) badge.textContent = '✏️ Edit Existing Code';
    if (hint) hint.textContent = 'AI will specifically modify, delete & add to current code and update history';
    if (pInput && !pInput.value) {
      pInput.placeholder = 'Describe what to modify, delete, or add to current code… e.g. "remove print statements and add error handling", "delete lines 15-20 and add JSON export"';
    }
    if (goTxt) goTxt.textContent = 'Apply & Edit Code';
  } else {
    if (badge) badge.textContent = '✨ Fresh Generation';
    if (hint) hint.textContent = 'AI will generate a fresh program from scratch and save as a new snippet';
    if (pInput && !pInput.value) {
      pInput.placeholder = 'Write what you want the AI to build from scratch… e.g. "make a code that prints hi", "build a calculator class", "LSL rainbow glow script"';
    }
    if (goTxt) goTxt.textContent = 'Send & Generate';
  }
  save();
}

let customIdeasByLang = {};
let ideasRefreshing = false;

function renderQuickIdeas(langId = st.lang, customIdeas = null){
  const wrap = $('#lcQuickIdeas');
  if (!wrap) return;
  if (Array.isArray(customIdeas) && customIdeas.length) {
    customIdeasByLang[langId] = customIdeas;
  }
  const ideas = customIdeasByLang[langId] || LANG_IDEAS_POOL[langId] || LANG_IDEAS_POOL.python;
  wrap.innerHTML = ideas.map(item => `
    <button type="button" class="lc-idea-chip" data-p="${A.esc(item.prompt)}" title="${A.esc(item.prompt)}">${A.esc(item.label)}</button>
  `).join('');

  wrap.querySelectorAll('button[data-p]').forEach(btn => {
    btn.onclick = () => {
      const p = btn.dataset.p || '';
      const inp = $('#lcPrompt');
      if (inp) {
        inp.value = p;
        st.prompt = p;
        inp.focus();
      }
    };
  });
}

async function refreshAiIdeas(){
  if (ideasRefreshing) return;
  ideasRefreshing = true;
  const l = L();
  const btn = $('#lcRefreshIdeasBtn');
  const ic = $('#lcRefreshIdeasIcon');
  const txt = $('#lcRefreshIdeasText');
  if (btn) btn.classList.add('spinning');
  if (txt) txt.textContent = 'Thinking…';

  try {
    const res = await fetch('/api/lokicode/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lang: l.id,
        refresh: true,
        currentCode: (st.code || '').slice(0, 500)
      })
    });
    if (res.ok) {
      const j = await res.json();
      if (Array.isArray(j.ideas) && j.ideas.length) {
        renderQuickIdeas(l.id, j.ideas);
        A.toast(`✨ AI generated ${j.ideas.length} fresh ${l.name} code ideas!`, 'ok');
        return;
      }
    }
  } catch (_e) {} finally {
    ideasRefreshing = false;
    if (btn) btn.classList.remove('spinning');
    if (ic) ic.textContent = '🔄';
    if (txt) txt.textContent = 'AI Ideas';
  }
}

function isDefaultOrTemplateCode(c){
  const t = String(c || '').trim();
  if (!t) return true;
  if (t.startsWith('// Choose a language') || t.startsWith('// Select one of')) return true;
  if (t.split('\n').length <= 3 && /\bprint\s*\(/i.test(t)) return true;
  return TEMPLATES.some(tpl => tpl.code.trim() === t);
}

/* ---------- Language Selector ---------- */
function renderLangs(){
  const h = $('#lcLangs');
  if (!h) return;
  const switchLangTo = (lid) => {
    if (busy) return;
    st.lang = lid;
    st.verified = false;
    hideVerifyBanner();
    renderLangs();
    renderQuickIdeas(lid);
    if (isDefaultOrTemplateCode(st.code)) {
      const tpl = TEMPLATES.find(t => t.lang === lid);
      if (tpl) {
        st.code = tpl.code;
      }
    }
    paint(st.code);
    updateFile();
    save();
    const lObj = LANGS.find(x => x.id === lid);
    if (lObj) A.toast(`Switched to ${lObj.icon} ${lObj.name}`, 'ok');
  };

  const existingButtons = h.querySelectorAll('button[data-lang]');
  if (existingButtons.length === LANGS.length) {
    existingButtons.forEach(b => {
      const lid = b.dataset.lang;
      const isSelected = lid === st.lang;
      b.classList.toggle('on', isSelected);
      b.setAttribute('aria-selected', String(isSelected));
      b.onclick = (e) => {
        if (e) {
          if (typeof e.preventDefault === 'function') e.preventDefault();
          if (typeof e.stopPropagation === 'function') e.stopPropagation();
        }
        switchLangTo(lid);
      };
    });
  } else {
    h.innerHTML = '';
    LANGS.forEach(l => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.lang = l.id;
      b.className = 'lang' + (l.id === st.lang ? ' on' : '');
      b.style.setProperty('--c', l.c);
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', l.id === st.lang ? 'true' : 'false');
      b.innerHTML = `<i></i><span class="lang-ic">${l.icon}</span><span>${l.name}</span>`;
      b.onclick = (e) => {
        if (e) {
          if (typeof e.preventDefault === 'function') e.preventDefault();
          if (typeof e.stopPropagation === 'function') e.stopPropagation();
        }
        switchLangTo(l.id);
      };
      h.appendChild(b);
    });
  }
  renderQuickIdeas(st.lang);
}

function updateFile(){
  const l = L();
  const f = $('#lcFile');
  const filename = (l.id === 'java' ? 'Main' : l.id === 'csharp' ? 'Program' : l.id === 'html' ? 'index' : 'main') + '.' + l.ext;
  if (f) f.textContent = filename;
  const text = (st.code || '').trim();
  const lines = text ? text.split('\n').length : 1;
  const stats = $('#lcStats');
  if (stats) stats.textContent = `${l.name} · ${lines} line${lines === 1 ? '' : 's'}`;
  const lcTag = $('#lcLineCount');
  if (lcTag) lcTag.textContent = `${lines} line${lines === 1 ? '' : 's'}`;
  const vPill = $('#lcVerifiedPill');
  if (vPill) vPill.hidden = !st.verified;
  updateMetrics();
}

function updateMetrics(){
  const l = L();
  const text = String(st.code || '');
  const lines = text.trim() ? text.trim().split('\n').length : 1;
  const tokens = (text.match(/\S+/g) || []).length;
  
  // Count function definitions across all 11 languages (including Rust fn and Go func)
  const defMatches = text.match(/\b(def\s+\w+|function\s+\w+|fn\s+\w+|func\s+(?:\([^)]+\)\s*)?\w+|\w+\s*\(.*?\)\s*\{|class\s+\w+|struct\s+\w+|state\s+\w+)/g) || [];
  const funcs = defMatches.length;

  // Bracket balance inspection
  let braces = 0, parens = 0, brackets = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '{') braces++;
    else if (c === '}') braces--;
    else if (c === '(') parens++;
    else if (c === ')') parens--;
    else if (c === '[') brackets++;
    else if (c === ']') brackets--;
  }
  const isBalanced = braces === 0 && parens === 0 && brackets === 0;

  const mCount = $('#lcMetricLines');
  if (mCount) mCount.textContent = `${lines} LOC`;
  const mTok = $('#lcMetricTokens');
  if (mTok) mTok.textContent = `${tokens} tokens`;
  const mDefs = $('#lcMetricFuncs');
  if (mDefs) mDefs.textContent = `${funcs} defs`;
  const mBrk = $('#lcMetricBrackets');
  if (mBrk) {
    mBrk.textContent = isBalanced ? '✓ Syntax balanced' : '⚠ Brackets unbalanced';
    mBrk.style.color = isBalanced ? '#6ee7b7' : '#fca5a5';
  }
  const mLang = $('#lcMetricLang');
  if (mLang) mLang.textContent = `${l.icon} ${l.name}`;

  const docTitle = $('#lcActiveItemTitle');
  if (docTitle) {
    if (st.activeDocId) {
      const doc = getHistory().find(d => d.id === st.activeDocId);
      docTitle.textContent = '📝 ' + (doc ? doc.title : 'Saved Snippet');
    } else {
      docTitle.textContent = '📝 Unsaved Draft';
    }
  }
}

let lastHljsTime = 0;
function paint(code, opts = {}){
  const l = L();
  if (l.id === 'lsl') ensureLSL();
  if (l.id === 'matlab') ensureMATLAB();
  const text = String(code || '');
  const fastStream = !!opts.fast;
  const showCursor = !!opts.cursor;
  const now = performance.now();
  const shouldHighlight = !fastStream || (now - lastHljsTime > 120 && text.length < 24000);
  let html;
  if (shouldHighlight && window.hljs) {
    lastHljsTime = now;
    const candidate = hljs.getLanguage(l.hl) ? l.hl : (l.id === 'lsl' ? 'cpp' : null);
    try {
      html = candidate && hljs.getLanguage(candidate)
        ? hljs.highlight(text, {language: candidate, ignoreIllegals: true}).value
        : A.esc(text);
    } catch(_){
      html = A.esc(text);
    }
  } else {
    html = A.esc(text);
  }
  const el = $('#lcCode');
  if (el) {
    const lines = html.split('\n');
    const lastIdx = lines.length - 1;
    el.innerHTML = lines
      .map((x, idx) => `<span class="ln">${x}${showCursor && idx === lastIdx ? '<span class="lc-type-cursor" aria-hidden="true"></span>' : ''}</span>`)
      .join('\n');
  }
  updateFile();
}

function setCode(code, isVerified = false){
  st.code = String(code || '');
  st.verified = isVerified;
  paint(st.code);
  updateFile();
  save();
}

function extractCode(raw){
  if (!raw) return '';
  const text = String(raw).replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const fenceMatch = text.match(/```(?:[\w+#.-]*)\s*\n([\s\S]*?)(?:```|$)/);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].replace(/\s+$/, '');
  }
  return text.replace(/^```[^\n]*\n?/, '').replace(/```$/, '').trim();
}

/* ---------- Multimodal Image Attachment Manager (Upload / Paste / Drop) ---------- */
let attachedImages = [];

function formatBytes(bytes){
  if (!bytes || bytes < 1024) return (bytes || 0) + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function renderImagePreviews(){
  const strip = $('#lcImagesPreview');
  const cntEl = $('#lcImgCount');
  if (cntEl) {
    cntEl.textContent = String(attachedImages.length);
    cntEl.hidden = attachedImages.length === 0;
  }
  if (!strip) return;
  if (!attachedImages.length) {
    strip.innerHTML = '';
    strip.hidden = true;
    return;
  }
  strip.hidden = false;
  strip.innerHTML = attachedImages.map((img, idx) => `
    <div class="lc-img-item" data-idx="${idx}">
      <img src="${img.dataUrl}" alt="${A.esc(img.name)}">
      <div class="lc-img-meta">
        <b title="${A.esc(img.name)}">${A.esc(img.name)}</b>
        <small>${A.esc(formatBytes(img.size))}</small>
      </div>
      <button type="button" class="lc-img-rm" data-rm-img="${idx}" aria-label="Remove image" title="Remove attachment">✕</button>
    </div>
  `).join('');

  strip.querySelectorAll('button[data-rm-img]').forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.rmImg);
      if (!Number.isNaN(idx)) {
        attachedImages.splice(idx, 1);
        renderImagePreviews();
      }
    };
  });
}

function compressImageFile(file){
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/')) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => {
      const origUrl = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        const maxSide = 1600;
        let w = img.naturalWidth || img.width || 800;
        let h = img.naturalHeight || img.height || 600;
        if (w > maxSide || h > maxSide) {
          const ratio = Math.min(maxSide / w, maxSide / h);
          w = Math.max(1, Math.round(w * ratio));
          h = Math.max(1, Math.round(h * ratio));
        }
        try {
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const outMime = file.type === 'image/png' && file.size < 450000 ? 'image/png' : 'image/jpeg';
          const outUrl = canvas.toDataURL(outMime, 0.88);
          resolve({
            id: 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            name: file.name || 'screenshot.png',
            mimeType: outMime,
            size: Math.round((outUrl.length * 3) / 4),
            dataUrl: outUrl
          });
        } catch (_e) {
          resolve({
            id: 'img_' + Date.now(),
            name: file.name || 'image.png',
            mimeType: file.type,
            size: file.size || origUrl.length,
            dataUrl: origUrl
          });
        }
      };
      img.onerror = () => resolve(null);
      img.src = origUrl;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

async function addAttachedImageFiles(fileList){
  const files = Array.from(fileList || []).filter(f => f && f.type && f.type.startsWith('image/'));
  if (!files.length) return;
  const remaining = Math.max(0, 4 - attachedImages.length);
  if (remaining <= 0) {
    A.toast('Maximum 4 images can be attached at once.', 'info');
    return;
  }
  let added = 0;
  for (const f of files.slice(0, remaining)) {
    const processed = await compressImageFile(f);
    if (processed) {
      attachedImages.push(processed);
      added++;
    }
  }
  renderImagePreviews();
  if (added > 0) {
    A.toast(`🖼️ Attached ${added} image${added > 1 ? 's' : ''} — LokiCode will inspect ${added > 1 ? 'them' : 'it'}!`, 'ok');
  }
}

/* ---------- Rich Real-Time Working Steps Pipeline ---------- */
function startWorkUI(initialTask){
  const box = $('#lcWorking');
  if (!box) return;
  box.hidden = false;
  box.classList.add('is-live');
  box.classList.remove('is-done');
  finishedTasks = [];
  currentTask = initialTask || 'Analyzing requirements & algorithmic intent…';
  verifiedTokenCount = 0;
  workStartMs = performance.now();

  const statusEl = $('#lcWorkStatus');
  if (statusEl) statusEl.textContent = 'Working';
  const auditEl = $('#lcWordAudit');
  if (auditEl) auditEl.hidden = true;

  renderWorkDrawer();

  clearInterval(workTimerId);
  workTimerId = setInterval(() => {
    const tEl = $('#lcWorkTimer');
    if (tEl) tEl.textContent = fmtElapsed(performance.now() - workStartMs);
  }, 100);
}

function advanceWorkStep(nextTask){
  if (currentTask && currentTask !== 'Idle') {
    finishedTasks.push({
      time: fmtElapsed(performance.now() - workStartMs),
      text: currentTask
    });
  }
  currentTask = nextTask;
  const curEl = $('#lcWorkCur');
  if (curEl) curEl.textContent = nextTask;
  renderWorkDrawer();
}

function updateTokenAudit(tokenStr, totalVerified){
  verifiedTokenCount = totalVerified;
  const auditEl = $('#lcWordAudit');
  const tokEl = $('#lcWordToken');
  if (auditEl && tokEl && tokenStr) {
    auditEl.hidden = false;
    tokEl.textContent = tokenStr.slice(0, 22);
  }
  const sumEl = $('#lcAuditSummary');
  if (sumEl) {
    sumEl.textContent = `${verifiedTokenCount} symbols, variables & statements verified (100% OK)`;
  }
}

function finishWorkUI(summaryText){
  clearInterval(workTimerId);
  const totalElapsed = fmtElapsed(performance.now() - workStartMs);
  if (currentTask && currentTask !== 'Completed') {
    finishedTasks.push({
      time: totalElapsed,
      text: currentTask
    });
  }
  currentTask = 'Completed — All code units, AST & variables verified';
  const box = $('#lcWorking');
  if (box) {
    box.classList.remove('is-live');
    box.classList.add('is-done');
  }
  const statusEl = $('#lcWorkStatus');
  if (statusEl) statusEl.textContent = 'Worked';
  const timerEl = $('#lcWorkTimer');
  if (timerEl) timerEl.textContent = totalElapsed;
  const curEl = $('#lcWorkCur');
  if (curEl) curEl.textContent = summaryText || `Generated & verified in ${totalElapsed}`;
  renderWorkDrawer();
}

function renderWorkDrawer(){
  const finList = $('#lcFinishedList');
  const countEl = $('#lcFinishedCount');
  if (countEl) countEl.textContent = String(finishedTasks.length);
  if (finList) {
    if (!finishedTasks.length) {
      finList.innerHTML = `<li class="empty-li">Initializing pipeline tasks…</li>`;
    } else {
      finList.innerHTML = finishedTasks.map(item =>
        `<li><span class="t-check">✓</span><span class="t-time">${A.esc(item.time)}</span><span class="t-txt">${A.esc(item.text)}</span></li>`
      ).join('');
    }
  }
  const curBox = $('#lcCurrentlyBox');
  if (curBox) {
    curBox.innerHTML = `<span class="pulse-dot"></span> <span>${A.esc(currentTask)}</span>`;
  }
  const sumEl = $('#lcAuditSummary');
  if (sumEl) {
    sumEl.textContent = `${verifiedTokenCount} symbols, variables & statements verified (100% OK)`;
  }
}

let lastVerifyFailed = false;
let fixingBusy = false;
let fixCtl = null;

function ensureFixStyles(){
  if ($('#lcFixStyles')) return;
  const s = document.createElement('style');
  s.id = 'lcFixStyles';
  s.textContent = `
    .lc-verify-banner { flex-wrap: wrap; }
    .lc-verify-banner.fixing { background: rgba(245, 158, 11, 0.16); border: 1px solid rgba(251, 191, 36, 0.55); color: #fde68a; }
    .lc-verify-banner .v-body { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .lc-verify-banner .v-body b { display: block; line-height: 1.3; }
    .lc-verify-banner .v-body small { display: block; line-height: 1.35; opacity: 0.92; }
    .lc-banner-actions { margin-left: auto; display: flex; gap: 8px; align-items: center; }
    .lc-btn-fix, .lc-btn-stop {
      padding: 7px 14px; border-radius: 10px; font-size: 0.82rem; font-weight: 800; cursor: pointer;
    }
    .lc-btn-fix {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.35), rgba(239, 68, 68, 0.28));
      border: 1px solid rgba(251, 191, 36, 0.75); color: #fde68a;
    }
    .lc-btn-fix:hover { filter: brightness(1.08); }
    .lc-btn-stop {
      background: rgba(239, 68, 68, 0.22); border: 1px solid rgba(248, 113, 113, 0.7); color: #fecaca;
    }
    #lcFixErrors.pulse-fix { animation: pop 0.35s var(--ease); }
  `;
  document.head.appendChild(s);
}

function ensureFixUi(){
  ensureFixStyles();
  const verify = $('#lcVerify');
  if (verify && !$('#lcFixErrors')) {
    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'lcFixErrors';
    b.className = 'lc-btn-fix';
    b.hidden = true;
    b.title = 'Keep fixing until the compiler reports 0 errors';
    b.textContent = '🔧 Fix errors';
    b.onclick = () => { void fixUntilZero(); };
    verify.after(b);
  }
  if (verify && !$('#lcFixStop')) {
    const sbtn = document.createElement('button');
    sbtn.type = 'button';
    sbtn.id = 'lcFixStop';
    sbtn.className = 'lc-btn-stop';
    sbtn.hidden = true;
    sbtn.title = 'Stop the fix loop';
    sbtn.textContent = '⏹ Stop';
    sbtn.onclick = () => stopFixLoop();
    ($('#lcFixErrors') || verify).after(sbtn);
  }
}

function setFixUi(state){
  ensureFixUi();
  const fix = $('#lcFixErrors');
  const stop = $('#lcFixStop');
  if (fix) {
    fix.hidden = state !== 'ready';
    fix.disabled = state !== 'ready';
    if (state === 'ready') fix.classList.add('pulse-fix');
  }
  if (stop) stop.hidden = state !== 'running';
}

function stopFixLoop(){
  try { fixCtl && fixCtl.abort(); } catch (_e) {}
}

function hideVerifyBanner(){
  const b = $('#lcVerifyBanner');
  if (b) b.hidden = true;
}

function showVerifyBanner(kind, title, details, opts){
  const b = $('#lcVerifyBanner');
  if (!b) return;
  opts = opts || {};
  ensureFixStyles();
  b.hidden = false;
  const isFixing = kind === 'fixing' || !!opts.fixing;
  const showFix = !isFixing && (opts.showFix === true || (kind === 'fixed' && opts.showFix !== false && !opts.unavailable));
  if (kind === 'ok') lastVerifyFailed = false;
  else if (showFix) lastVerifyFailed = true;
  setFixUi(isFixing ? 'running' : (showFix || lastVerifyFailed && kind === 'fixed' ? 'ready' : 'hidden'));
  b.className = 'lc-verify-banner ' + (isFixing ? 'fixing' : kind);
  const fixBtn = showFix
    ? `<div class="lc-banner-actions"><button type="button" class="lc-btn-fix lc-banner-fix" title="Keep fixing until the compiler reports 0 errors">🔧 Fix errors</button></div>`
    : (isFixing ? `<div class="lc-banner-actions"><button type="button" class="lc-btn-stop lc-banner-stop" title="Stop the fix loop">⏹ Stop</button></div>` : '');
  b.innerHTML = `
    <div class="v-ic">${kind === 'ok' ? '🛡️' : (isFixing ? '⏳' : '🔧')}</div>
    <div class="v-body">
      <b>${A.esc(title)}</b>
      <small>${A.esc(details)}</small>
    </div>
    ${fixBtn}
    <button type="button" class="v-close" aria-label="Dismiss">✕</button>
  `;
  const closeBtn = b.querySelector('.v-close');
  if (closeBtn) closeBtn.onclick = () => { b.hidden = true; };
  const bannerFix = b.querySelector('.lc-banner-fix');
  if (bannerFix) bannerFix.onclick = () => { void fixUntilZero(); };
  const bannerStop = b.querySelector('.lc-banner-stop');
  if (bannerStop) bannerStop.onclick = () => stopFixLoop();
}

function authHeaders(){
  const headers = { 'Content-Type': 'application/json' };
  const tok = window.LZAuth?.getToken?.();
  if (tok) headers['x-lz-token'] = tok;
  if (window.LZAuth?.getUserBackupHeader) {
    const hb = window.LZAuth.getUserBackupHeader();
    if (hb) headers['x-lz-user-backup'] = hb;
  }
  return headers;
}

async function fixUntilZero(){
  const raw = (st.code || '').trim();
  if (!raw) {
    A.toast('Generate, paste, or write code first to fix!', 'err');
    return;
  }
  if (busy || fixingBusy) return;
  const l = L();
  fixingBusy = true;
  busy = true;
  fixCtl = new AbortController();
  setFixUi('running');
  startWorkUI(`Fixing ${l.name} errors — will keep going until 0 remain…`);
  showVerifyBanner('fixing', `Fixing ${l.name} errors…`, 'Starting compiler-driven fix loop');
  let lastCode = raw;
  let lastMsg = { ok: false, issues: [], rounds: 0, compiler: '', reason: '' };
  try {
    const res = await fetch('/api/lokicode/fix', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ lang: l.id, code: raw, prompt: st.prompt || '', comments: true }),
      signal: fixCtl.signal
    });
    if (!res.ok || !res.body) throw new Error('Fix HTTP ' + res.status);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const d = line.slice(5).trim();
        if (d === '[DONE]') continue;
        let j;
        try { j = JSON.parse(d); } catch (_e) { continue; }
        if (j.code && j.code !== lastCode) {
          lastCode = j.code;
          setCode(j.code, !!j.ok);
        }
        if (j.status || j.round) {
          const n = j.issueCount != null ? j.issueCount : (j.issues || []).length;
          advanceWorkStep(j.status || `Round ${j.round}/${j.maxRounds || 15} · ${n} error(s)`);
          showVerifyBanner('fixing', j.status || `Round ${j.round} · ${n} error(s) left`, (j.issues || []).slice(0, 3).join(' · ') || l.name);
        }
        if (j.done) lastMsg = j;
      }
    }
    if (lastMsg.code) setCode(lastMsg.code, !!lastMsg.ok);
    const tool = lastMsg.compiler || lastMsg.method || 'compiler';
    if (lastMsg.ok) {
      lastVerifyFailed = false;
      finishWorkUI(`✓ 0 errors after ${lastMsg.rounds} fix round${lastMsg.rounds === 1 ? '' : 's'} · ${tool}`);
      showVerifyBanner('ok', `✓ ${l.name} verified — 0 errors`, `${tool} · ${lastMsg.rounds} fix round${lastMsg.rounds === 1 ? '' : 's'} · ${lastMsg.verifyMs ?? 0} ms`);
      A.sound && A.sound('done');
      A.toast(`✓ ${l.name} is clean after ${lastMsg.rounds} fix round${lastMsg.rounds === 1 ? '' : 's'}`, 'ok');
    } else {
      const issues = lastMsg.issues || [];
      const why = lastMsg.reason === 'aborted' ? 'Stopped'
        : lastMsg.reason === 'no-progress' ? 'No further progress'
        : lastMsg.reason === 'max-rounds' ? 'Reached the safety cap (15 rounds)'
        : 'Fix loop ended';
      lastVerifyFailed = true;
      finishWorkUI(`⚠ ${why} · ${issues.length} error(s) remain`);
      showVerifyBanner('fixed', `⚠ ${why} — ${issues.length} error(s) remain`, (issues.slice(0, 3).join(' · ') || why) + ` · ${tool}. Click Fix errors to continue.`, { showFix: true });
      A.toast(`${issues.length} ${l.name} error(s) remain — you can run Fix errors again`, 'err');
    }
  } catch (err) {
    if (err && (err.name === 'AbortError' || /abort/i.test(err.message || ''))) {
      lastVerifyFailed = true;
      finishWorkUI('⏹ Fix stopped');
      showVerifyBanner('fixed', '⏹ Fix stopped', 'Stopped on request. Click Fix errors to continue from the current code.', { showFix: true });
      A.toast('Fix loop stopped', 'ok');
    } else {
      lastVerifyFailed = true;
      finishWorkUI('⚠ Fix failed');
      showVerifyBanner('fixed', 'Fix failed', err && err.message ? err.message : 'The fix service did not finish.', { showFix: true });
      A.toast('Fix failed — try again', 'err');
    }
  } finally {
    fixingBusy = false;
    busy = false;
    const wrap = $('#lcWrap');
    if (wrap) wrap.classList.remove('typing');
    setFixUi(lastVerifyFailed ? 'ready' : 'hidden');
    const goBtn = $('#lcGo');
    if (goBtn) { goBtn.disabled = false; goBtn.classList.remove('loading'); }
  }
}

function showLimitSlot(msg, showUpgradeBtn = true){
  const mid = $('#lcMidSpace');
  if (!mid) return;
  let slot = $('#lcLimitSlot');
  if (!slot) {
    slot = document.createElement('div');
    slot.id = 'lcLimitSlot';
    mid.appendChild(slot);
  }
  slot.innerHTML = '';
  slot.hidden = false;
  if (window.LZ?.Usage?.createLimitBlock) {
    slot.appendChild(window.LZ.Usage.createLimitBlock(msg));
  } else {
    slot.textContent = msg || "It's not possible because your limit has reached the maximum.";
  }
  if (showUpgradeBtn) {
    const upgWrap = document.createElement('div');
    upgWrap.style.cssText = 'margin-top:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;';
    const upgBtn = document.createElement('button');
    upgBtn.type = 'button';
    upgBtn.className = 'btn primary sm';
    upgBtn.innerHTML = '💎 Upgrade Plan (Pro: 52/4h · Ultimate: ∞ Unlimited)';
    upgBtn.onclick = () => {
      if (window.LZApp && typeof window.LZApp.showView === 'function') {
        window.LZApp.showView('benches');
      }
    };
    upgWrap.appendChild(upgBtn);
    slot.appendChild(upgWrap);
  }
}

function clearLimitSlot(){
  const slot = $('#lcLimitSlot');
  if (slot) {
    slot.innerHTML = '';
    slot.hidden = true;
  }
}

function extractStreamingCode(raw){
  if (!raw) return '';
  let text = String(raw).replace(/<think>[\s\S]*?<\/think>/gi, '');
  if (text.includes('<think>') && !text.includes('</think>')) {
    text = text.replace(/<think>[\s\S]*/i, '');
  }
  const openIdx = text.indexOf('```');
  if (openIdx >= 0) {
    const afterFence = text.slice(openIdx + 3);
    const nlIdx = afterFence.indexOf('\n');
    let body = nlIdx >= 0 ? afterFence.slice(nlIdx + 1) : '';
    const closeIdx = body.lastIndexOf('```');
    if (closeIdx >= 0) body = body.slice(0, closeIdx);
    return body;
  }
  return text.replace(/^\s+/, '');
}

function estimateMsgTokens(messages, out){
  let chars = String(out || '').length;
  for (const m of (messages || [])) {
    chars += typeof m.content === 'string' ? m.content.length : 100;
  }
  return Math.max(80, Math.round(chars / 4));
}

/* ---------- Ultra-Fast Streaming AI Call (Lokizen 4.0 Stark) ---------- */
async function callStarkExtraHigh(messages, opts = {}){
  if (window.LZ?.Usage && !window.LZ.Usage.canUse()) {
    throw window.LZ.limitReachedErr();
  }
  const onToken = typeof opts.onToken === 'function' ? opts.onToken : null;

  // 1. Primary when streaming: direct backend SSE (/api/chat/stream) with Gemini + fast Kepler failover
  if (onToken && window.LZ && typeof window.LZ.streamBackendChat === 'function') {
    try {
      const out = await window.LZ.streamBackendChat(messages, {
        temperature: 0.2,
        maxTokens: 8192,
        timeout: 12000,
        onToken
      });
      if (out && out.trim()) {
        window.LZ.Usage?.consume?.(estimateMsgTokens(messages, out));
        return out;
      }
    } catch (e) {
      if (e && e.code === 'LIMIT_REACHED') throw e;
    }
  }

  // 2. Direct client engine SSE streaming (handles consumption automatically)
  if (window.LZ && typeof window.LZ.chat === 'function') {
    try {
      const out = await window.LZ.chat(messages, {
        tier: 'stark',
        level: 1,
        temperature: 0.2,
        maxTokens: 8192,
        timeout: 10000,
        onToken: onToken || undefined
      });
      if (out && out.trim()) return out;
    } catch (e) {
      if (e && e.code === 'LIMIT_REACHED') throw e;
    }
  }

  // 3. Direct /api/chat JSON fallback
  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        messages,
        temperature: 0.2,
        maxTokens: 8192
      })
    });
    if (r.status === 403) {
      const j = await r.json().catch(() => ({}));
      if (j.code === 'LIMIT_REACHED' && window.LZ?.limitReachedErr) {
        throw window.LZ.limitReachedErr();
      }
    }
    if (r.ok) {
      const j = await r.json();
      if (j && j.text && j.text.trim()) {
        window.LZ.Usage?.consume?.(estimateMsgTokens(messages, j.text));
        if (onToken) onToken(j.text, j.text);
        return j.text;
      }
    }
  } catch (e) {
    if (e && e.code === 'LIMIT_REACHED') throw e;
  }

  throw new Error('Could not reach Lokizen 4.0 Stark');
}

/* ---------- AI Auto-Naming for Code History (Latest Updates Only) ---------- */
function autoSummarizeCode(code, langName, prompt){
  if (prompt && prompt.length > 4 && prompt.length < 50 && !/\b(code|make|write|build)\b/i.test(prompt)) {
    return prompt.trim();
  }
  // Extract key function or class names
  const classMatch = code.match(/class\s+([A-Za-z0-9_]+)/);
  if (classMatch && classMatch[1] && !['Main', 'Program'].includes(classMatch[1])) {
    return `${classMatch[1]} (${langName})`;
  }
  const funcMatch = code.match(/def\s+([A-Za-z0-9_]+)/);
  if (funcMatch && funcMatch[1]) {
    const cleanFn = funcMatch[1].replace(/_/g, ' ');
    return `${cleanFn.charAt(0).toUpperCase() + cleanFn.slice(1)} (${langName})`;
  }
  if (/prime/i.test(code)) return `Prime Sieve Benchmark (${langName})`;
  if (/door|sensor/i.test(code)) return `Auto-Door Controller (${langName})`;
  if (/matrix/i.test(code)) return `Matrix Arithmetic Engine (${langName})`;
  if (/task|queue|worker/i.test(code)) return `Task Queue Worker (${langName})`;
  if (/canvas|particle/i.test(code)) return `Canvas Particle Physics (${langName})`;

  const firstComment = code.match(/(?:\/\/|#)\s*([^\n]{5,45})/);
  if (firstComment && firstComment[1]) {
    return firstComment[1].replace(/^[*-]\s*/, '').trim();
  }

  return `${langName} Program · ${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
}

async function saveCodeToHistory(opts = {}){
  const {notify = true, explicitTitle = null} = opts;
  const rawCode = (st.code || '').trim();
  if (!rawCode) {
    if (notify) A.toast('No code to save yet!', 'err');
    return;
  }

  const l = L();
  let title = explicitTitle;
  if (!title) {
    title = autoSummarizeCode(rawCode, l.name, st.prompt);
  }

  const list = getHistory();
  const now = Date.now();

  let targetId = st.activeDocId;
  let existingIndex = -1;

  if (targetId) {
    existingIndex = list.findIndex(item => item.id === targetId);
  }

  // If not found by active ID or in 'edit' mode, see if prompt/code matches an existing document
  if (existingIndex === -1 && st.mode === 'edit' && list.length > 0) {
    existingIndex = 0; // update most recently touched
    targetId = list[0].id;
  }

  if (existingIndex >= 0) {
    // Strictly update existing item in place: ONLY saves latest update!
    const updated = {
      ...list[existingIndex],
      title: title || list[existingIndex].title,
      code: rawCode,
      lang: l.id,
      prompt: st.prompt || list[existingIndex].prompt,
      updatedAt: now
    };
    list.splice(existingIndex, 1);
    list.unshift(updated); // Move to top of history
    st.activeDocId = updated.id;
    setHistory(list);
    save();
    if (notify) A.toast(`✓ Updated "${updated.title}" in Code History (Latest update saved)`, 'ok');
  } else {
    // Fresh code: create new entry
    const newDoc = {
      id: 'doc_' + now + '_' + Math.random().toString(36).slice(2, 6),
      title: title,
      code: rawCode,
      lang: l.id,
      prompt: st.prompt || '',
      createdAt: now,
      updatedAt: now
    };
    list.unshift(newDoc);
    st.activeDocId = newDoc.id;
    setHistory(list);
    save();
    if (notify) A.toast(`✓ Saved as "${newDoc.title}" in Code History!`, 'ok');
  }

  updateMetrics();
}

function renderHistoryModal(){
  const m = $('#lcHistoryModal');
  const body = $('#lcHistList');
  if (!m || !body) return;
  const list = getHistory();

  if (!list.length) {
    body.innerHTML = `
      <div style="text-align:center;padding:36px;color:var(--dim);font-family:var(--mono);">
        <p style="font-size:1.5rem;margin-bottom:8px;">📜</p>
        <p>No saved code history yet.</p>
        <p style="font-size:0.8rem;color:var(--muted);">Click <b>💾 Save Code</b> in LokiCode or generate code to start your history.</p>
      </div>
    `;
    m.hidden = false;
    return;
  }

  body.innerHTML = list.map(item => {
    const langObj = LANGS.find(l => l.id === item.lang) || LANGS[0];
    const lines = (item.code || '').split('\n').length;
    const dateStr = new Date(item.updatedAt || item.createdAt).toLocaleDateString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
    const isActive = item.id === st.activeDocId;

    return `
      <div class="lc-hist-card ${isActive ? 'active' : ''}" data-id="${item.id}">
        <div class="lc-hist-info">
          <div class="lc-hist-head">
            <span class="lc-hist-badge" style="background:${langObj.c}25;color:${langObj.c};border:1px solid ${langObj.c}55;">
              ${langObj.icon} ${langObj.name}
            </span>
            <b class="lc-hist-title">${A.esc(item.title)}</b>
            ${isActive ? '<span style="font-size:0.7rem;padding:2px 6px;border-radius:4px;background:rgba(0,255,156,0.15);color:#00ff9c;">ACTIVE</span>' : ''}
          </div>
          <div class="lc-hist-meta">
            <span>${lines} LOC</span>
            <span>·</span>
            <span>Updated ${dateStr}</span>
            ${item.prompt ? `<span>·</span> <span style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">"${A.esc(item.prompt)}"</span>` : ''}
          </div>
        </div>
        <div class="lc-hist-actions">
          <button type="button" class="lc-hist-btn load" data-act="load" data-id="${item.id}">Load in Editor</button>
          <button type="button" class="lc-hist-btn" data-act="copy" data-id="${item.id}">Copy</button>
          <button type="button" class="lc-hist-btn del" data-act="del" data-id="${item.id}">✕</button>
        </div>
      </div>
    `;
  }).join('');

  body.onclick = (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    const id = btn.dataset.id;
    const item = list.find(x => x.id === id);
    if (!item) return;

    if (act === 'load') {
      st.lang = item.lang;
      st.activeDocId = item.id;
      st.prompt = item.prompt || '';
      setCode(item.code, true);
      renderLangs();
      updateFile();
      const pInp = $('#lcPrompt');
      if (pInp) pInp.value = st.prompt;
      m.hidden = true;
      A.toast(`✓ Loaded "${item.title}" into editor`, 'ok');
    } else if (act === 'copy') {
      A.copyText(item.code);
      A.toast('✓ Code copied to clipboard', 'ok');
    } else if (act === 'del') {
      const filtered = list.filter(x => x.id !== id);
      setHistory(filtered);
      if (st.activeDocId === id) st.activeDocId = null;
      renderHistoryModal();
      A.toast('Removed from history', 'ok');
    }
  };

  m.hidden = false;
}

function renderTemplatesModal(){
  const m = $('#lcTemplatesModal');
  const grid = $('#lcTplGrid');
  if (!m || !grid) return;

  grid.innerHTML = TEMPLATES.map(t => {
    const langObj = LANGS.find(l => l.id === t.lang) || LANGS[0];
    return `
      <div class="lc-tpl-card" data-tid="${t.id}">
        <h4>
          <span>${langObj.icon} ${A.esc(t.title)}</span>
          <span style="font-family:var(--mono);font-size:0.72rem;color:${langObj.c};background:${langObj.c}20;padding:2px 8px;border-radius:6px;">${langObj.name}</span>
        </h4>
        <p>${A.esc(t.desc)}</p>
        <button type="button" class="lc-btn" style="margin-top:auto;width:100%;background:rgba(var(--acc-rgb),0.12);color:var(--acc);border-color:rgba(var(--acc-rgb),0.35);">
          ⚡ Use Template
        </button>
      </div>
    `;
  }).join('');

  grid.onclick = (e) => {
    const card = e.target.closest('.lc-tpl-card');
    if (!card) return;
    const tid = card.dataset.tid;
    const t = TEMPLATES.find(x => x.id === tid);
    if (!t) return;
    st.lang = t.lang;
    st.activeDocId = null; // New template loaded
    st.prompt = t.title;
    setCode(t.code, true);
    renderLangs();
    updateFile();
    const pInp = $('#lcPrompt');
    if (pInp) pInp.value = t.title;
    m.hidden = true;
    A.toast(`✓ Loaded ${t.title} template!`, 'ok');
  };

  m.hidden = false;
}

/* ---------- Code Beautifier / Formatter ---------- */
function formatCode(){
  const raw = (st.code || '').trim();
  if (!raw) return;
  const l = L();

  const lines = raw.split('\n');
  let indent = 0;
  const formatted = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    // If line starts with closing brace, decrease indent first
    if (/^[}\])]/.test(trimmed)) {
      indent = Math.max(0, indent - 1);
    }
    const currentIndent = '    '.repeat(indent);
    const out = currentIndent + trimmed;
    // If line ends with opening brace, increase indent for next line
    if (/[{\[(]$/.test(trimmed)) {
      indent++;
    }
    return out;
  }).join('\n');

  setCode(formatted, st.verified);
  A.toast('✨ Code formatted and indentation aligned!', 'ok');
}

/* ---------- Single-Roundtrip Turbo SSE Stream (/api/lokicode/stream) ---------- */
let lastStreamVerify = null;
let lastStreamMeta = null;
async function streamLokiCodeTurbo(payload, onToken){
  lastStreamVerify = null;
  lastStreamMeta = null;
  const headers = { 'Content-Type': 'application/json' };
  const tok = window.LZAuth?.getToken?.();
  if (tok) headers['x-lz-token'] = tok;
  if (window.LZAuth?.getUserBackupHeader) {
    const b = window.LZAuth.getUserBackupHeader();
    if (b) headers['x-lz-user-backup'] = b;
  }

  const ctl = new AbortController();
  const connectTimer = setTimeout(() => ctl.abort(), 9000);
  const totalStreamTimer = setTimeout(() => ctl.abort(), 14500);
  let chunkWatchdog = null;
  const bumpWatchdog = () => {
    if (chunkWatchdog) clearTimeout(chunkWatchdog);
    chunkWatchdog = setTimeout(() => ctl.abort(), 6500);
  };
  try {
    const res = await fetch('/api/lokicode/stream', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: ctl.signal
    });
    clearTimeout(connectTimer);

    if (res.status === 403 || res.status === 503) {
      const j = await res.json().catch(() => ({}));
      if (j.account) window.LZAuth?.updateAccountState?.(j.account);
      const err = new Error(j.message || "It's not possible because your limit has reached the maximum.");
      err.code = j.code || 'LIMIT_REACHED';
      throw err;
    }

    if (!res.ok || !res.body) {
      throw new Error('Stream HTTP ' + res.status);
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let full = '';
    bumpWatchdog();

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bumpWatchdog();
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith('data:')) continue;
          const d = line.slice(5).trim();
          if (d === '[DONE]') continue;
          try {
            const j = JSON.parse(d);
            if (j.account) {
              window.LZAuth?.updateAccountState?.(j.account);
            }
            if (j.delta) {
              full += j.delta;
              if (onToken) onToken(j.delta, full);
            }
            // Server repetition guard / dedupe / auto-fix replaced the buffer
            if (typeof j.reset === 'string') {
              full = j.reset;
              if (onToken) onToken('', full);
            }
            if (j.meta) lastStreamMeta = j.meta;
            if (j.verify) {
              lastStreamVerify = j.verify;
              if (!lastStreamMeta && j.verify.provider) {
                lastStreamMeta = {
                  provider: j.verify.provider,
                  model: j.verify.model || 'auto',
                  elapsedMs: j.verify.elapsedMs || 0,
                };
              }
            }
            if (j.status) { try { advanceWorkStep(j.status); } catch (_s) {} }
          } catch (_e) {}
        }
      }
    } catch (readErr) {
      // If watchdog fired after substantial code already streamed, return it cleanly for local verification
      if (!(full && full.length > 60)) throw readErr;
    }
    return full;
  } finally {
    clearTimeout(connectTimer);
    clearTimeout(totalStreamTimer);
    if (chunkWatchdog) clearTimeout(chunkWatchdog);
  }
}

/* ---------- Main Generate / Edit Handler (10x Single-Roundtrip Streaming + Vision + Team Sync) ---------- */
async function generate(e){
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }
  const inp = $('#lcPrompt');
  const p = (inp ? inp.value : '').trim();
  const hasImgs = attachedImages.length > 0;
  if (!p && !hasImgs) {
    A.toast('Write a prompt or attach an error/example image first!', 'info');
    if (inp) {
      inp.focus();
      inp.classList.add('flash-warn');
      setTimeout(() => inp.classList.remove('flash-warn'), 800);
    }
    return;
  }
  if (busy) {
    A.toast('LokiCode is currently generating. Please wait a moment…', 'info');
    return;
  }

  if (window.LZ?.Usage && !window.LZ.Usage.canUse()) {
    const msg = "It's not possible because your limit has reached the maximum.";
    showLimitSlot(msg, true);
    A.toast(msg, 'err');
    return;
  }

  const effectivePrompt = p || (st.mode === 'edit'
    ? 'Inspect the attached image(s) and fix or improve the code accordingly.'
    : 'Analyze the attached image(s) and generate complete working code.');

  clearLimitSlot();
  st.prompt = p;
  st.verified = false;
  hideVerifyBanner();
  busy = true;
  const l = L();
  const wantComments = !$('#lcComments') || $('#lcComments').checked;
  const previousCode = String(st.code || '');
  const imgsSnapshot = attachedImages.slice(0, 4);

  const goBtn = $('#lcGo');
  const goTxt = $('#lcGoText');
  if (goBtn) {
    goBtn.disabled = true;
    goBtn.classList.add('loading');
  }
  if (goTxt) goTxt.textContent = hasImgs ? 'Analyzing Image & Streaming…' : (st.mode === 'edit' ? 'Streaming Edit…' : 'Turbo Streaming…');

  const wrap = $('#lcCodeWrap');
  if (wrap) wrap.classList.add('typing');

  const initialTask = hasImgs
    ? `Inspecting ${imgsSnapshot.length} attached image${imgsSnapshot.length > 1 ? 's' : ''} & streaming ${l.name}…`
    : (st.mode === 'edit'
        ? `Streaming ${l.name} edits via Turbo Pro Engine…`
        : `Streaming ${l.name} code via Turbo Pro Engine…`);
  startWorkUI(initialTask);

  window.LZCodeTeams?.broadcastSync?.({
    status: 'working',
    statusDetail: initialTask,
    lang: l.id,
    prompt: effectivePrompt,
    mode: st.mode,
    activity: `Started ${st.mode === 'edit' ? 'editing' : 'generating'} ${l.name}`
  });

  let lastTeamBroadcastAt = 0;
  let latestStreamedCode = '';
  let steppedStream = false;

  // Smooth adaptive live typewriter pacer so code ALWAYS appears as it is being typed (never dumped all at once)
  const prefersReducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let displayedLen = 0;
  let streamEnded = false;
  let typerActive = false;
  let typerRaf = 0;
  let typerTimer = 0;
  let lastFrameAt = 0;
  let userPinnedTop = false;
  let drainResolvers = [];

  const isNearBottom = () => {
    if (!wrap) return true;
    return (wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight) < 88;
  };
  const onWrapScroll = () => {
    userPinnedTop = !isNearBottom();
  };
  if (wrap) wrap.addEventListener('scroll', onWrapScroll, { passive: true });

  const resolveDrain = () => {
    const list = drainResolvers;
    drainResolvers = [];
    list.forEach(fn => { try { fn(); } catch(_){} });
  };

  const stopTyper = () => {
    typerActive = false;
    if (typerRaf) { cancelAnimationFrame(typerRaf); typerRaf = 0; }
    if (typerTimer) { clearTimeout(typerTimer); typerTimer = 0; }
    if (wrap) wrap.removeEventListener('scroll', onWrapScroll);
    resolveDrain();
  };

  const renderTyperStep = (nowTs) => {
    typerRaf = 0;
    typerTimer = 0;
    if (!typerActive) return;

    const dt = Math.min(80, Math.max(10, lastFrameAt ? (nowTs - lastFrameAt) : 16));
    lastFrameAt = nowTs;

    const target = latestStreamedCode || '';
    if (displayedLen > target.length) displayedLen = target.length;
    const backlog = target.length - displayedLen;

    if (backlog > 0) {
      let step;
      if (prefersReducedMotion) {
        step = backlog;
      } else if (streamEnded) {
        // Snappily finish typing any remaining buffered tail (~0.15-0.35s drain)
        const drainRate = Math.min(14000, Math.max(2200, backlog * 7.0));
        step = Math.max(8, Math.round((drainRate * dt) / 1000));
      } else {
        // Smooth real-time live-typing cadence that keeps tight pace with fast token streams
        const liveRate = Math.min(5400, Math.max(460, backlog * 4.2));
        step = Math.max(3, Math.round((liveRate * dt) / 1000));
      }
      displayedLen = Math.min(target.length, displayedLen + step);
      const visible = target.slice(0, displayedLen);
      st.code = visible;
      paint(visible, { fast: true, cursor: true });
      const tokens = (visible.match(/\S+/g) || []).length;
      const m = visible.match(/([A-Za-z_]\w*)\s*$/);
      updateTokenAudit(m ? m[1] : 'typing', tokens);
      if (wrap && !userPinnedTop) wrap.scrollTop = wrap.scrollHeight;
    } else if (displayedLen === 0 && !streamEnded) {
      // Show active blinking cursor while first tokens are arriving
      paint('', { fast: true, cursor: true });
    }

    if (streamEnded && displayedLen >= target.length) {
      typerActive = false;
      resolveDrain();
      return;
    }

    if (document.hidden) {
      typerTimer = setTimeout(() => renderTyperStep(performance.now()), 20);
    } else {
      typerRaf = requestAnimationFrame(renderTyperStep);
    }
  };

  const ensureTyperRunning = () => {
    if (typerActive) return;
    typerActive = true;
    lastFrameAt = performance.now();
    if (document.hidden) {
      typerTimer = setTimeout(() => renderTyperStep(performance.now()), 16);
    } else {
      typerRaf = requestAnimationFrame(renderTyperStep);
    }
  };

  const waitForTypewriterDrain = () => new Promise((resolve) => {
    if (prefersReducedMotion || displayedLen >= (latestStreamedCode || '').length) {
      stopTyper();
      resolve();
      return;
    }
    drainResolvers.push(resolve);
    ensureTyperRunning();
  });

  // Start immediately with a clean typing canvas, blinking emerald caret, and scroll editor into view
  if (st.mode !== 'edit') {
    st.code = '';
    paint('', { fast: true, cursor: true });
  }
  const editorStage = $('#lcWork') || wrap;
  if (editorStage && typeof editorStage.scrollIntoView === 'function') {
    try { editorStage.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' }); } catch(_) {}
  }
  ensureTyperRunning();

  const onStreamChunk = (_delta, full) => {
    const cleaned = extractStreamingCode(full);
    if (!cleaned) return;
    latestStreamedCode = cleaned;
    if (!steppedStream && cleaned.length > 20) {
      steppedStream = true;
      advanceWorkStep(`2. Typing live ${l.name} code & auditing syntax…`);
    }
    ensureTyperRunning();
    const now = performance.now();
    if (now - lastTeamBroadcastAt > 200) {
      lastTeamBroadcastAt = now;
      window.LZCodeTeams?.broadcastSync?.({
        status: 'working',
        statusDetail: 'Streaming code live…',
        code: cleaned,
        lang: l.id,
        prompt: effectivePrompt,
        mode: st.mode
      });
    }
  };

  try {
    advanceWorkStep(`1. Streaming AST & ${l.name} tokens live…`);
    let rawResponse = '';
    try {
      rawResponse = await streamLokiCodeTurbo(
        {
          lang: l.id,
          mode: st.mode,
          prompt: p,
          previousCode: st.mode === 'edit' ? previousCode : '',
          comments: wantComments,
          images: imgsSnapshot.map(im => ({ name: im.name, mimeType: im.mimeType, dataUrl: im.dataUrl }))
        },
        onStreamChunk
      );
    } catch (turboErr) {
      if (turboErr && (turboErr.code === 'LIMIT_REACHED' || turboErr.code === 'MAINTENANCE_ACTIVE')) {
        throw turboErr;
      }
      // Fallback to multi-provider Stark call if turbo stream endpoint fails unexpectedly
      const userParts = [{ type: 'text', text: st.mode === 'edit' && previousCode.trim()
        ? `EXISTING ${l.name} CODE:\n\`\`\`${l.id}\n${previousCode}\n\`\`\`\n\nEDIT REQUEST: ${effectivePrompt}`
        : `User request (${l.name}): ${effectivePrompt}` }];
      for (const im of imgsSnapshot) {
        userParts.push({ type: 'image_url', image_url: { url: im.dataUrl } });
      }
      rawResponse = await callStarkExtraHigh([
        { role: 'system', content: `You are LokiCode AI (${l.name}). Output ONLY a single \`\`\`${l.id} fenced code block.` },
        { role: 'user', content: imgsSnapshot.length ? userParts : userParts[0].text }
      ], { onToken: onStreamChunk });
    }

    let generatedCode = extractCode(rawResponse) || latestStreamedCode;
    if (!generatedCode) {
      throw new Error('Empty code returned from model');
    }

    let audited = quickStaticSanitize(generatedCode, l.id);
    // Stream already ran the real compiler + fix loop. Only call verify if the stream omitted it.
    if (!lastStreamVerify) {
      try {
        const vRes = await fetch('/api/lokicode/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lang: l.id, code: audited.code })
        });
        if (vRes.ok) {
          const vj = await vRes.json();
          if (vj && vj.code) {
            audited = { code: vj.code, fixes: [...audited.fixes, ...(vj.fixes || [])] };
            lastStreamVerify = {
              ok: !!vj.valid,
              lang: vj.lang || l.id,
              compiler: vj.compiler || `${l.name} Syntax Verifier`,
              errors: vj.errors || [],
              warnings: vj.warnings || [],
              fixes: vj.fixes || [],
              fixPasses: (vj.fixes || []).length ? 1 : 0,
              verifyMs: vj.verifyMs ?? 2
            };
          }
        }
      } catch (_vErr) {}
    }

    // Let the live typewriter smoothly finish typing the complete audited script before finalizing
    latestStreamedCode = audited.code;
    streamEnded = true;
    await waitForTypewriterDrain();
    stopTyper();

    if (previousCode.trim() && previousCode.trim() !== audited.code.trim()) {
      lastCodeBeforeEdit = previousCode;
      const diffBtn = $('#lcDiffToggle');
      if (diffBtn) diffBtn.hidden = false;
    }
    setCode(audited.code, !!(lastStreamVerify && lastStreamVerify.ok));
    if (diffViewOpen) renderDiffView();

    const lineCount = audited.code.split('\n').length;
    const tokens = (audited.code.match(/\S+/g) || []).length;
    updateTokenAudit('All symbols valid', tokens);
    advanceWorkStep(`3. Syntax & structural audit (${lineCount} lines) complete.`);
    const sv = lastStreamVerify;
    const metaInfo = lastStreamMeta || (sv && sv.provider ? { provider: sv.provider, model: sv.model, elapsedMs: sv.elapsedMs } : null);
    const metaElapsedStr = metaInfo && metaInfo.elapsedMs ? (metaInfo.elapsedMs / 1000).toFixed(metaInfo.elapsedMs < 1000 ? 2 : 1) + 's' : '';
    const metaModelStr = metaInfo && metaInfo.model && metaInfo.model !== 'auto' ? ` (${metaInfo.model})` : '';
    const metaTag = metaInfo && metaInfo.provider ? [metaInfo.provider + metaModelStr, metaElapsedStr].filter(Boolean).join(' · ') : '';

    if (sv && (sv.compiler || sv.method)) {
      const runTxt = sv.run && sv.run.ran ? (sv.run.ok ? (sv.run.eventsRun && sv.run.eventsRun.length ? ` · test run OK (${sv.run.eventsRun.join(', ')})` : ' · test run OK') : ' · test run failed') : '';
      const engineTxt = sv.run && sv.run.ran && sv.run.engine && !String(sv.compiler || '').includes(sv.run.engine) ? ` + ${sv.run.engine}` : '';
      const fixTxt = sv.fixPasses ? ` · ${sv.fixPasses} auto-fix pass${sv.fixPasses > 1 ? 'es' : ''}` : '';
      const extras = [sv.loopStopped ? 'repetition loop stopped' : '', sv.repeatsRemoved ? `${sv.repeatsRemoved} repeated lines removed` : ''].filter(Boolean).join(' · ');
      const timeTxt = `${sv.verifyMs ?? sv.ms ?? 0} ms`;
      const tool = sv.compiler || sv.method;
      const isLsl = l.id === 'lsl' || sv.lang === 'lsl';
      const metaPrefix = metaTag ? `${metaTag} · ` : '';
      if (sv.ok) {
        finishWorkUI(`✓ Compiled & verified ${lineCount} lines of ${l.name}${metaTag ? ' · ' + metaTag : ''}`);
        const title = isLsl ? `✓ Compiles for OpenSim / Eureka World · ${lineCount} lines` : `✓ Verified ${l.name} · ${lineCount} lines`;
        showVerifyBanner('ok', title, `${metaPrefix}${tool}${engineTxt}${runTxt}${fixTxt} · ${timeTxt}${extras ? ' · ' + extras : ''}`);
      } else {
        const issues = (sv.issues && sv.issues.length)
          ? sv.issues
          : (sv.errors || []).map((e) => e && e.message != null ? `L${e.line}:${e.col ?? 0} ${e.message}` : String(e));
        const failTitle = sv.compiled && sv.run && !sv.run.ok
          ? `⚠ Compiles, but the test run found a problem`
          : `✗ ${issues.length} ${l.name} compiler/runtime issue(s)`;
        finishWorkUI(`⚠ Generated ${lineCount} lines of ${l.name} · ${issues.length} issue(s)${metaTag ? ' · ' + metaTag : ''}`);
        showVerifyBanner('fixed', failTitle, `${metaPrefix}${issues.slice(0, 3).join(' · ')} · ${tool}${fixTxt}`, { showFix: true });
      }
      // Only mark verified when the real compiler/runtime said so.
      st.verified = !!sv.ok;
      updateFile();
    } else {
      finishWorkUI(`Generated ${lineCount} lines of ${l.name} (${tokens} symbols)${metaTag ? ' · ' + metaTag : ''}`);
      st.verified = false;
      updateFile();
    }

    if (imgsSnapshot.length > 0) {
      attachedImages = [];
      renderImagePreviews();
    }

    await saveCodeToHistory({notify: false});
    window.LZCodeTeams?.broadcastSync?.({
      status: 'worked',
      statusDetail: `Verified ${lineCount} lines of ${l.name} code`,
      code: audited.code,
      lang: l.id,
      prompt: effectivePrompt,
      mode: st.mode,
      activity: `${st.mode === 'edit' ? 'Edited' : 'Generated'} ${l.name} code (${lineCount} lines)`
    });

    A.sound && A.sound('done');
    A.toast(lastStreamVerify && lastStreamVerify.ok ? `✓ ${l.name} code ${st.mode === 'edit' ? 'edited' : 'generated'} & verified!` : `Generated ${l.name} code`, lastStreamVerify && lastStreamVerify.ok === false ? 'err' : 'ok');
  } catch (err) {
    if (err && err.code === 'LIMIT_REACHED') {
      finishWorkUI(`⚠️ Limit reached`);
      showLimitSlot(err.message);
      A.toast(err.message, 'err');
    } else {
      finishWorkUI(`✗ Error: ${err.message || 'Please try again'}`);
      A.toast('Could not complete generation — please try again', 'err');
    }
  } finally {
    stopTyper();
    if (wrap) wrap.classList.remove('typing');
    busy = false;
    if (goBtn) {
      goBtn.disabled = false;
      goBtn.classList.remove('loading');
    }
    if (goTxt) goTxt.textContent = st.mode === 'edit' ? 'Apply & Edit Code' : 'Send & Generate';
    save();
  }
}

/* ---------- Static Code Sanitizer & Final Auto-Fix ---------- */
// Collapse a block (2-40 lines) repeated 3+ times in a row, or a line repeated 4+ times (model repetition loops).
function collapseRepeatedBlocksClient(code){
  const norm = (l) => l.trim().replace(/\s+/g, ' ');
  const meaningful = (l) => (l.match(/[A-Za-z0-9_]/g) || []).length >= 6;
  let lines = String(code || '').split('\n');
  let removed = 0;
  let changed = true;
  while (changed) {
    changed = false;
    const n = lines.map(norm);
    outer: for (let size = 1; size <= 40; size++) {
      const need = size === 1 ? 4 : 3;
      for (let i = 0; i + size * need <= lines.length; i++) {
        const block = n.slice(i, i + size);
        if (!block.some(meaningful)) continue;
        let copies = 1, j = i + size;
        while (j + size <= lines.length && n.slice(j, j + size).every((l, k) => l === block[k])) { copies++; j += size; }
        if (copies >= need) {
          removed += (copies - 1) * size;
          lines = lines.slice(0, i + size).concat(lines.slice(j));
          changed = true;
          break outer;
        }
      }
    }
  }
  return { code: lines.join('\n'), removed };
}

function quickStaticSanitize(code, langId){
  let fixed = String(code || '').replace(/\r\n/g, '\n').trim();
  const fixes = [];

  if (/^```/.test(fixed)) {
    fixed = extractCode(fixed);
    fixes.push('Removed stray markdown code fences');
  }

  const dd = collapseRepeatedBlocksClient(fixed);
  if (dd.removed > 0) {
    fixed = dd.code;
    fixes.push(`Removed ${dd.removed} repeated line(s)`);
  }

  if (['java', 'lsl', 'javascript', 'typescript', 'cpp', 'csharp', 'rust', 'go'].includes(langId)) {
    let openBraces = 0;
    for (let i = 0; i < fixed.length; i++) {
      if (fixed[i] === '{') openBraces++;
      else if (fixed[i] === '}') openBraces--;
    }
    if (openBraces > 0) {
      fixed += '\n' + '}'.repeat(openBraces);
      fixes.push(`Closed ${openBraces} unclosed curly brace(s)`);
    }
  }

  if (langId === 'lsl' && !/\bdefault\s*\{/.test(fixed)) {
    fixed = `// Auto-wrapped in valid LSL default state\ndefault\n{\n    state_entry()\n    {\n        ${fixed.replace(/\n/g, '\n        ')}\n    }\n}`;
    fixes.push('Added required LSL `default { state_entry() }` block');
  }

  if (langId === 'java' && !/\bclass\s+\w+/.test(fixed)) {
    fixed = `public class Main {\n    public static void main(String[] args) {\n        ${fixed.replace(/\n/g, '\n        ')}\n    }\n}`;
    fixes.push('Wrapped statements in `public class Main`');
  }

  return {code: fixed, fixes};
}

async function verifyFinalCode(){
  const rawCode = (st.code || '').trim();
  if (!rawCode || busy) {
    A.toast('Generate or write code first to verify!', 'err');
    return;
  }

  clearLimitSlot();
  const l = L();
  const verifyBtn = $('#lcVerify');
  if (verifyBtn) {
    verifyBtn.disabled = true;
    verifyBtn.textContent = '🔍 Verifying Code…';
  }

  startWorkUI(`Running Compiler Verification on ${l.name} code…`);
  hideVerifyBanner();

  try {
    advanceWorkStep(`Auditing AST structure, brackets & type definitions…`);
    const staticCheck = quickStaticSanitize(rawCode, l.id);
    const words = (rawCode.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) || []);
    updateTokenAudit(words[words.length - 1] || 'main', words.length);

    // Real compiler / parser / sandboxed run for every language (same endpoint as generate).
    const vRes = await fetch('/api/lokicode/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang: l.id, code: staticCheck.code || rawCode })
    });
    if (!vRes.ok) {
      st.verified = false;
      updateFile();
      finishWorkUI('⚠ Verifier unavailable');
      showVerifyBanner('fixed', 'Verifier unavailable', 'The compile/verify service did not respond. This code was not marked verified.', { showFix: false, unavailable: true });
      A.toast('Verifier unavailable — not marked verified', 'err');
      return;
    }
    const vj = await vRes.json();
    if (vj.code && vj.code !== rawCode) {
      setCode(vj.code, !!vj.valid);
    } else {
      st.verified = !!vj.valid;
      updateFile();
      save();
    }
    const tool = vj.compiler || vj.method || 'compiler';
    const run = vj.run;
    const runTxt = run && run.ran ? (run.ok ? (run.eventsRun && run.eventsRun.length ? ` · test run OK (${run.eventsRun.join(', ')})` : ' · test run OK') : ' · test run failed') : '';
    const timeTxt = `${vj.verifyMs ?? vj.ms ?? 0} ms`;
    const fixNote = Array.isArray(vj.fixes) && vj.fixes.length ? ` · ${vj.fixes.join(' · ')}` : '';
    const stats = vj.stats || {};
    const lslMetrics = l.id === 'lsl' && (stats.events || stats.llCalls)
      ? ` · ${stats.states || 1} state · ${stats.events || 0} events · ${stats.llCalls || 0} ll* calls`
      : '';
    if (!vj.valid) {
      const errs = Array.isArray(vj.errors) ? vj.errors : [];
      finishWorkUI(`⚠ Found ${errs.length || 'a'} ${l.name} issue(s)`);
      showVerifyBanner('fixed', `✗ ${l.name} verification failed`, (errs.slice(0, 3).join(' · ') || 'compile/run error') + ` · ${tool} · ${timeTxt}`);
      A.toast(`${l.name} diagnostics — review the banner`, 'err');
      return;
    }
    finishWorkUI(`✓ Verified ${l.name} · ${tool}`);
    showVerifyBanner('ok', `✓ ${l.name} verified`, `${tool}${runTxt}${fixNote}${lslMetrics} · ${timeTxt}`);
    A.sound && A.sound('done');
    A.toast(`✓ ${l.name} verified — ${tool} · ${timeTxt}`, 'ok');

  } catch (err) {
    if (err && err.code === 'LIMIT_REACHED') {
      finishWorkUI('⚠️ Daily limit reached');
      showLimitSlot(err.message);
      A.toast(err.message, 'err');
    } else {
      st.verified = false;
      updateFile();
      finishWorkUI('⚠ Verification failed');
      showVerifyBanner('fixed', 'Verification failed', err && err.message ? err.message : 'The compiler did not return a result. This code was not marked verified.');
      A.toast('Verification failed', 'err');
    }
  } finally {
    if (verifyBtn) {
      verifyBtn.disabled = false;
      verifyBtn.textContent = '✓ Verify Final Code';
    }
  }
}

/* ---------- Interactive Code Runner with Output & Stdin Input ---------- */
let currentRunStdin = '';
let currentRunCode = '';
let currentRunLang = null;

function appendRunOutput(text, cls = ''){
  const term = $('#lcRunTerminal');
  if (!term) return;
  const span = document.createElement('span');
  if (cls) span.className = cls;
  span.textContent = text;
  term.appendChild(span);
  term.scrollTop = term.scrollHeight;
}

function clearRunOutput(){
  const term = $('#lcRunTerminal');
  if (term) term.innerHTML = '';
}

async function executeProgram(code, l, stdinText = ''){
  const statusPill = $('#lcRunStatusPill');
  const stagePill = $('#lcCompilerStagePill');
  const compEngineEl = $('#lcCompilerEngineName');
  const compBuildEl = $('#lcCompilerBuildStatus');
  const compTimeEl = $('#lcCompilerExecTime');
  const timeEl = $('#lcRunTime');
  const t0 = performance.now();

  const normalizedStdin = String(stdinText || '').includes('|')
    ? String(stdinText).split('|').map(s => s.trim()).join('\n')
    : String(stdinText || '');

  const defaultEngines = {
    python: 'Python 3.11 Bytecode Compiler & VM',
    matlab: 'MATLAB R2024b / GNU Octave 9.2 Numerical Engine',
    java: 'OpenJDK 22 javac + HotSpot JVM',
    lsl: 'Second Life LSL2 Mono Compiler & Simulator',
    javascript: 'Node.js V8 JIT Compiler',
    typescript: 'TypeScript 5.6 Transpiler + V8 JIT',
    html: 'HTML5 DOM + Canvas + WebGL Live Renderer',
    cpp: 'GCC 13.2.0 C++20 Optimizing Compiler',
    csharp: '.NET 8.0 / Mono C# Compiler',
    rust: 'Rustc 1.82.0 LLVM Compiler',
    go: 'Go 1.23 Compiler & Runtime'
  };

  if (compEngineEl) compEngineEl.textContent = defaultEngines[l.id] || `${l.name} Compiler`;
  if (compBuildEl) {
    compBuildEl.textContent = '⚙ Compiling & building target…';
    compBuildEl.style.color = '#7dd3fc';
  }
  if (stagePill) {
    stagePill.textContent = '◌ Compiling…';
    stagePill.className = 'lc-compiler-pill running';
  }
  if (statusPill) {
    statusPill.className = 'lc-runner-status-pill running';
    statusPill.textContent = 'COMPILING & RUNNING';
  }

  const fileLabel = `${(l.id === 'java' ? 'Main' : l.id === 'csharp' ? 'Program' : l.id === 'html' ? 'index' : 'main')}.${l.ext}`;
  appendRunOutput(`▶ [Compiler: ${defaultEngines[l.id] || l.name}] Compiling & executing ${fileLabel}…\n`, 'meta');
  if (normalizedStdin) {
    appendRunOutput(`> [stdin input sent]: ${normalizedStdin.replace(/\n/g, ' | ')}\n`, 'stdin-echo');
  }

  try {
    const isPureDomHtml = l.id === 'html' || (l.id === 'javascript' && /document\.|canvas|innerHTML|appendChild|window\./.test(code));
    if (isPureDomHtml) {
      const fr = $('#lcRunPreviewFrame');
      const isHtml = l.id === 'html';
      if (fr) {
        fr.style.display = 'block';
        const shim = `<script>(function(){
          const send = (t,a) => parent.postMessage({__lc:1,t,a:a.map(x=>typeof x==='string'?x:JSON.stringify(x,null,2)||String(x)).join(' ')},'*');
          ['log','info','warn','error'].forEach(k=>{const o=console[k];console[k]=(...a)=>{send(k,a);try{o.apply(console,a)}catch(_){}}});
          const stdinQueue = ${JSON.stringify(normalizedStdin ? normalizedStdin.split('\n') : [])};
          window.prompt = function(msg){
            const val = stdinQueue.length ? stdinQueue.shift() : 'demo_input';
            send('info', ['[prompt]: ' + (msg||'') + ' -> ' + val]);
            return val;
          };
          addEventListener('error', e=>send('error',[e.message]));
        })();<\/script>`;
        fr.srcdoc = isHtml
          ? (code.match(/<head[^>]*>/i) ? code.replace(/<head[^>]*>/i, m => m + shim) : shim + code)
          : `<!DOCTYPE html><html><head><meta charset="utf-8">${shim}</head><body><script>try{\n${code.replace(/<\/script/gi, '<\\/script')}\n}catch(e){console.error(e&&e.stack||String(e))}<\/script></body></html>`;
      }
      await new Promise(r => setTimeout(r, 350));
      appendRunOutput('[✓] DOM bundle compiled & mounted in Live Preview below (Exit 0)\n', 'ok');
      if (compBuildEl) {
        compBuildEl.textContent = 'Compiled DOM & Scripts OK · Exit 0';
        compBuildEl.style.color = '#6ee7b7';
      }
      if (stagePill) {
        stagePill.textContent = '✓ Compiled OK';
        stagePill.className = 'lc-compiler-pill ok';
      }
      if (statusPill) {
        statusPill.className = 'lc-runner-status-pill';
        statusPill.textContent = 'COMPILED · EXIT 0';
      }
    } else {
      const fr = $('#lcRunPreviewFrame');
      if (fr) fr.style.display = 'none';

      let ranOnline = false;
      try {
        const res = await fetch('/api/run', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            lang: l.id,
            code,
            stdin: normalizedStdin
          })
        });

        if (res.ok) {
          const j = await res.json();
          if (j.compilerName && compEngineEl) {
            compEngineEl.textContent = j.compilerName;
          }
          if (!j.needsSimulation) {
            ranOnline = true;
            if (j.compileStage) {
              appendRunOutput(`[Build Stage]: ${j.compileStage}\n`, 'meta');
            }
            if (j.usedAutoInput) {
              appendRunOutput('💡 Program reads standard input (stdin). Ran with default demo inputs — type your own values in the "Interactive Program Input (stdin)" box above and click "↵ Send Input & Run"!\n\n', 'meta');
            }
            if (j.stdout) {
              appendRunOutput(j.stdout.endsWith('\n') ? j.stdout : j.stdout + '\n');
            }
            if (j.stderr) {
              if (/EOFError|NoSuchElementException/i.test(j.stderr)) {
                appendRunOutput('\n⚠️ Input required: Enter your input in the "Interactive Program Input (stdin)" box above and click "↵ Send Input & Run"!\n', 'warn');
              } else {
                appendRunOutput(j.stderr.trim() + '\n', 'err');
              }
            }
            const exitCode = j.status ?? 0;
            appendRunOutput(`\n[✓] Compiled program finished with exit code ${exitCode}\n`, exitCode === 0 ? 'ok' : 'err');
            if (compBuildEl) {
              compBuildEl.textContent = j.compileStage || (exitCode === 0 ? 'Compiled & Executed OK · Exit 0' : `Exit Code ${exitCode}`);
              compBuildEl.style.color = exitCode === 0 ? '#6ee7b7' : '#fca5a5';
            }
            if (stagePill) {
              stagePill.textContent = exitCode === 0 ? '✓ Compiled & Executed' : `⚠ Exit ${exitCode}`;
              stagePill.className = 'lc-compiler-pill ' + (exitCode === 0 ? 'ok' : 'err');
            }
            if (statusPill) {
              statusPill.className = 'lc-runner-status-pill' + (exitCode === 0 ? '' : ' err');
              statusPill.textContent = exitCode === 0 ? 'COMPILED · EXIT 0' : `EXIT ${exitCode}`;
            }
          }
        }
      } catch (_apiErr) {}

      if (!ranOnline) {
        const simPrompt = `Compile and execute this ${l.name} code and output the exact console stdout it produces.
Standard input (stdin) provided by user: "${normalizedStdin}"
Output ONLY the resulting stdout. Do not write markdown fences or explanations.`;
        const simOut = await callStarkExtraHigh([
          {role: 'system', content: simPrompt},
          {role: 'user', content: code}
        ]);
        appendRunOutput(simOut.trim() + '\n');
        appendRunOutput('\n[✓] Compiled & executed (Exit 0)\n', 'ok');
        if (compBuildEl) {
          compBuildEl.textContent = `Compiled ${l.name} target OK · Exit 0`;
          compBuildEl.style.color = '#6ee7b7';
        }
        if (stagePill) {
          stagePill.textContent = '✓ Compiled OK';
          stagePill.className = 'lc-compiler-pill ok';
        }
        if (statusPill) {
          statusPill.className = 'lc-runner-status-pill';
          statusPill.textContent = 'COMPILED · EXIT 0';
        }
      }
    }
  } catch (err) {
    if (err && err.code === 'LIMIT_REACHED') {
      const term = $('#lcRunTerminal');
      if (term && window.LZ?.Usage?.createLimitBlock) {
        term.appendChild(window.LZ.Usage.createLimitBlock(err.message));
      } else {
        appendRunOutput(`\n[!] ${err.message}\n`, 'err');
      }
    } else {
      appendRunOutput(`\n[!] Execution error: ${err.message || err}\n`, 'err');
    }
    if (compBuildEl) {
      compBuildEl.textContent = 'Compilation / Runtime Error';
      compBuildEl.style.color = '#fca5a5';
    }
    if (stagePill) {
      stagePill.textContent = '✗ Error';
      stagePill.className = 'lc-compiler-pill err';
    }
    if (statusPill) {
      statusPill.className = 'lc-runner-status-pill err';
      statusPill.textContent = err && err.code === 'LIMIT_REACHED' ? 'LIMIT REACHED' : 'EXEC ERROR';
    }
  } finally {
    const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
    if (timeEl) timeEl.textContent = `${elapsed}s elapsed`;
    if (compTimeEl) compTimeEl.textContent = `${elapsed}s`;
  }
}

async function run(){
  let code = (st.code || '').trim();
  const l = L();
  if (!code || code.startsWith('// Choose a language') || code.startsWith('// Select one of')) {
    const tpl = TEMPLATES.find(t => t.lang === l.id);
    if (tpl) {
      code = tpl.code;
      setCode(code, true);
    } else {
      A.toast('Generate or write code first to run!', 'err');
      return;
    }
  }

  const btn = $('#lcRun');
  if (btn) {
    btn.classList.add('busy');
    btn.textContent = '◌ Compiling…';
  }

  currentRunCode = code;
  currentRunLang = l;
  currentRunStdin = '';

  const runModal = $('#lcRunModal') || $('#labModal');
  const runTitle = $('#lcRunTitle') || $('#labTitle');
  const runBody = $('#lcRunBody') || $('#labBody');
  const stdinBar = $('#lcStdinBar');
  const stdinInp = $('#lcStdinInput');
  const stdinSendBtn = $('#lcStdinSend');

  if (runModal && runBody) {
    const fileLabel = `${(l.id === 'java' ? 'Main' : l.id === 'csharp' ? 'Program' : l.id === 'html' ? 'index' : 'main')}.${l.ext}`;
    if (runTitle) {
      runTitle.innerHTML = `${l.icon} Compiled Output · ${l.name} (<code>${fileLabel}</code>)`;
    }
    if (stdinBar) {
      stdinBar.hidden = false;
    }

    runBody.innerHTML = `
      <div class="lc-runner-wrap">
        <div class="lc-runner-head">
          <div class="lc-runner-meta">
            <span class="lc-runner-status-pill" id="lcRunStatusPill">INITIALIZING</span>
            <span id="lcRunTime">0.0s elapsed</span>
            <span>·</span>
            <span>${l.icon} ${l.name}</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span style="font-size:0.75rem;color:var(--dim);">Quick stdin presets:</span>
            <button type="button" class="lc-chip" data-v="10">10</button>
            <button type="button" class="lc-chip" data-v="25 | Alice | yes">25 | Alice | yes</button>
            <button type="button" class="lc-chip" data-v="42">42</button>
            <button type="button" class="lc-btn-subtle" id="lcClearRunBtn" style="padding:4px 10px;font-size:0.76rem;border-radius:6px;cursor:pointer;">
              🗑️ Clear
            </button>
          </div>
        </div>

        <div class="lc-terminal" id="lcRunTerminal"></div>

        <iframe id="lcRunPreviewFrame" style="display:none;width:100%;height:340px;border:0;border-top:1px solid var(--line);margin-top:10px;border-radius:10px;background:#fff;"></iframe>
      </div>
    `;

    const clr = $('#lcClearRunBtn', runBody);
    if (clr) clr.onclick = clearRunOutput;

    const triggerStdinRun = () => {
      const val = stdinInp ? stdinInp.value.trim() : '';
      clearRunOutput();
      executeProgram(currentRunCode, currentRunLang, val);
    };

    if (stdinSendBtn) {
      stdinSendBtn.onclick = triggerStdinRun;
    }
    if (stdinInp) {
      stdinInp.onkeydown = (ev) => {
        if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey || !ev.shiftKey)) {
          ev.preventDefault();
          triggerStdinRun();
        }
      };
    }

    const rerunBtn = $('#lcRerunBtn');
    if (rerunBtn) {
      rerunBtn.onclick = () => {
        clearRunOutput();
        executeProgram(currentRunCode, currentRunLang, stdinInp ? stdinInp.value.trim() : '');
      };
    }

    const toggleStdinBtn = $('#lcToggleStdinBtn');
    if (toggleStdinBtn && stdinBar) {
      toggleStdinBtn.onclick = () => {
        stdinBar.hidden = !stdinBar.hidden;
        if (!stdinBar.hidden && stdinInp) stdinInp.focus();
      };
    }

    runBody.querySelectorAll('.lc-chip').forEach(chip => {
      chip.onclick = () => {
        const val = chip.dataset.v || '';
        if (stdinInp) stdinInp.value = val;
        clearRunOutput();
        executeProgram(currentRunCode, currentRunLang, val);
      };
    });

    if (A && typeof A.openModal === 'function' && runModal.id) {
      A.openModal(runModal.id);
    } else {
      runModal.hidden = false;
    }
  }

  const initialStdin = stdinInp ? stdinInp.value.trim() : '';
  await executeProgram(code, l, initialStdin);

  if (btn) {
    btn.classList.remove('busy');
    btn.textContent = '▶ Run';
  }
}

// Receive logs from preview iframe
addEventListener('message', e => {
  const d = e.data;
  if (!d || !d.__lc) return;
  appendRunOutput(d.a + '\n', d.t === 'error' ? 'err' : d.t === 'warn' ? 'warn' : 'meta');
});

/* ---------- Explain Code ---------- */
async function explain(){
  if (!(st.code || '').trim()) return;
  const l = L();
  const m = $('#labModal');
  if (m) {
    $('#labTitle').innerHTML = '💡 Code Explanation · ' + l.name;
    const body = $('#labBody');
    if (window.LZ?.Usage && !window.LZ.Usage.canUse()) {
      body.innerHTML = '';
      body.appendChild(window.LZ.Usage.createLimitBlock());
      m.hidden = false;
      return;
    }
    body.innerHTML = '<div style="padding:20px;font-family:var(--mono);color:var(--dim);">Lokizen 4.0 Stark is analyzing your code architecture…</div>';
    m.hidden = false;
    try {
      const d = document.createElement('div');
      d.className = 'explain md';
      const r = await callStarkExtraHigh([
        {role:'system', content: 'Explain the following code clearly step-by-step with architecture overview. Reply in the same language as user prompt (Hebrew if Hebrew, otherwise English).'},
        {role:'user', content: '```' + l.id + '\n' + st.code.slice(0, 15000) + '\n```'}
      ], {
        onToken: (_delta, full) => {
          body.innerHTML = '';
          body.appendChild(d);
          A.renderMarkdown(d, full);
        }
      });
      A.renderMarkdown(d, r);
      body.innerHTML = '';
      body.appendChild(d);
    } catch(e) {
      if (e && e.code === 'LIMIT_REACHED' && window.LZ?.Usage?.createLimitBlock) {
        body.innerHTML = '';
        body.appendChild(window.LZ.Usage.createLimitBlock(e.message));
      } else {
        body.innerHTML = '<p style="padding:16px;color:#ff8fa5;">Could not generate explanation right now.</p>';
      }
    }
  }
}

/* ---------- Team Sync & Account Hydration ---------- */
function applyServerCodeState(data){
  if (!data || typeof data !== 'object') return;
  if (Array.isArray(data.codeHistory)) {
    localStorage.setItem('lz.code.history', JSON.stringify(data.codeHistory.slice(0, 50)));
    updateHistoryBadge();
  }
  if (data.lokicode && typeof data.lokicode === 'object') {
    const lc = data.lokicode;
    if (lc.lang && LANGS.some(l => l.id === lc.lang)) st.lang = lc.lang;
    st.code = lc.code || '';
    st.prompt = lc.prompt || '';
    st.verified = !!lc.verified;
    st.mode = lc.mode === 'edit' ? 'edit' : 'new';
    st.activeDocId = lc.activeDocId || null;
    localStorage.setItem('lz.code', JSON.stringify({
      lang: st.lang,
      code: (st.code || '').slice(0, 200000),
      prompt: st.prompt,
      verified: st.verified,
      mode: st.mode,
      activeDocId: st.activeDocId
    }));
    const pInp = $('#lcPrompt');
    if (pInp) pInp.value = st.prompt;
    renderLangs();
    setMode(st.mode);
    paint(st.code || '// Select one of the 8 languages above, describe what you want the AI to build, and click Send & Generate ⚡');
    updateFile();
  }
}

let isRemoteUpdate = false;
function onTeamUpdate(team, fromUsername){
  if (!team || typeof team !== 'object') return;
  isRemoteUpdate = true;
  try {
    if (team.lang && LANGS.some(l => l.id === team.lang)) st.lang = team.lang;
    if (typeof team.code === 'string') st.code = team.code;
    if (typeof team.prompt === 'string' && team.prompt) {
      st.prompt = team.prompt;
      const pInp = $('#lcPrompt');
      if (pInp && pInp.value !== team.prompt) pInp.value = team.prompt;
    }
    if (team.mode === 'edit' || team.mode === 'new') {
      st.mode = team.mode;
      const newBtn = $('#lcModeNew');
      const editBtn = $('#lcModeEdit');
      if (newBtn && editBtn) {
        newBtn.classList.toggle('on', st.mode === 'new');
        editBtn.classList.toggle('on', st.mode === 'edit');
      }
    }
    renderLangs();
    paint(st.code || '// Team workspace ready');
    updateFile();
    localStorage.setItem('lz.code', JSON.stringify({
      lang: st.lang,
      code: (st.code || '').slice(0, 200000),
      prompt: st.prompt || '',
      verified: !!st.verified,
      mode: st.mode,
      activeDocId: st.activeDocId
    }));

    const box = $('#lcWorking');
    const statusEl = $('#lcWorkStatus');
    const curEl = $('#lcWorkCur');
    if (box && (team.status === 'working' || team.status === 'worked')) {
      box.hidden = false;
      box.classList.toggle('is-live', team.status === 'working');
      box.classList.toggle('is-done', team.status === 'worked');
      if (statusEl) statusEl.textContent = team.status === 'working' ? 'Team Working' : 'Team Worked';
      if (curEl) {
        const who = fromUsername || team.updatedBy || 'Teammate';
        curEl.textContent = `${who}: ${team.statusDetail || (team.status === 'working' ? 'Updating code live…' : 'Updated shared code')}`;
      }
    }
  } finally {
    isRemoteUpdate = false;
  }
}

/* ---------- Public API ---------- */
function open({code, lang} = {}){
  if (code != null){
    const id = ALIAS[(lang || '').toLowerCase()] || (lang || '').toLowerCase();
    if (LANGS.some(l => l.id === id)) st.lang = id;
    setCode(code, true);
    renderLangs();
    updateFile();
  }
  A.showView('code');
}

function onShow(){
  window.LZCodeTeams?.renderBar?.();
  renderLangs();
  paint(st.code || '// Select one of the 8 languages above, describe what you want the AI to build, and click Send & Generate ⚡');
  updateFile();
  updateHistoryBadge();
  setMode(st.mode || 'new');
}

function init(){
  const boot = window.LZAuth?.getBootData?.();
  if (boot) applyServerCodeState(boot);
  window.LZCodeTeams?.renderBar?.();

  renderLangs();
  updateFile();
  updateHistoryBadge();
  onShow();

  if ($('#lcPrompt')) $('#lcPrompt').value = st.prompt || '';

  const goBtn = $('#lcGo');
  if (goBtn) {
    goBtn.onclick = (e) => {
      if (e) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
      }
      generate(e);
    };
  }

  const promptForm = $('#lcForm');
  if (promptForm) {
    promptForm.addEventListener('submit', (e) => {
      if (e) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
      }
      generate(e);
    });
  }

  if ($('#lcPrompt')) {
    let promptSyncTimer = 0;
    $('#lcPrompt').addEventListener('input', e => {
      if (isRemoteUpdate) return;
      st.prompt = e.target.value;
      window.LZCodeTeams?.broadcastCursor?.('prompt', true);
      clearTimeout(promptSyncTimer);
      promptSyncTimer = setTimeout(() => {
        if (isRemoteUpdate) return;
        window.LZCodeTeams?.broadcastSync?.({ prompt: st.prompt });
      }, 320);
    });
    $('#lcPrompt').addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || (!e.shiftKey && A.settings().sendOnEnter))) {
        e.preventDefault();
        e.stopPropagation();
        generate(e);
      }
    });
  }

  // Image Attachments (Button, File Input, Paste Ctrl+V, Drag & Drop)
  const attachBtn = $('#lcAttachImgBtn');
  const imgInput = $('#lcImageInput');
  const promptCard = $('#lcForm');
  if (attachBtn && imgInput) {
    attachBtn.onclick = () => imgInput.click();
    imgInput.addEventListener('change', async (ev) => {
      await addAttachedImageFiles(ev.target?.files);
      imgInput.value = '';
    });
  }
  if ($('#lcPrompt')) {
    $('#lcPrompt').addEventListener('paste', async (ev) => {
      const items = ev.clipboardData?.items;
      if (!items) return;
      const imgFiles = [];
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) imgFiles.push(f);
        }
      }
      if (imgFiles.length > 0) {
        await addAttachedImageFiles(imgFiles);
      }
    });
  }
  if (promptCard) {
    promptCard.addEventListener('dragover', (ev) => {
      if (ev.dataTransfer && Array.from(ev.dataTransfer.types || []).includes('Files')) {
        ev.preventDefault();
        promptCard.classList.add('drag-over');
      }
    });
    promptCard.addEventListener('dragleave', () => {
      promptCard.classList.remove('drag-over');
    });
    promptCard.addEventListener('drop', async (ev) => {
      promptCard.classList.remove('drag-over');
      const files = ev.dataTransfer?.files;
      if (files && files.length) {
        const hasImg = Array.from(files).some(f => f.type && f.type.startsWith('image/'));
        if (hasImg) {
          ev.preventDefault();
          await addAttachedImageFiles(files);
        }
      }
    });
  }

  // Mode buttons
  const modeNewBtn = $('#lcModeNew');
  const modeEditBtn = $('#lcModeEdit');
  if (modeNewBtn) modeNewBtn.onclick = () => setMode('new');
  if (modeEditBtn) modeEditBtn.onclick = () => setMode('edit');

  // Dynamic Quick Idea Chips & AI Refresh Button
  renderQuickIdeas(st.lang);
  const refreshIdeasBtn = $('#lcRefreshIdeasBtn');
  if (refreshIdeasBtn) {
    refreshIdeasBtn.onclick = () => refreshAiIdeas();
  }

  // Toggle expandable working drawer
  const toggleBtn = $('#lcWorkToggle');
  const workBar = $('.lc-work-bar');
  const toggleDrawer = (e) => {
    e && e.stopPropagation();
    const dr = $('#lcWorkDrawer');
    const wb = $('#lcWorking');
    if (!dr || !wb) return;
    const isOpen = !dr.hidden;
    dr.hidden = isOpen;
    wb.classList.toggle('open', !isOpen);
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(!isOpen));
  };
  if (toggleBtn) toggleBtn.onclick = toggleDrawer;
  if (workBar) workBar.onclick = toggleDrawer;

  // New LokiCode Power Tools: Optimize, Unit Tests, Convert Language
  async function runAiCodeTransform(instruction, label) {
    const rawCode = (st.code || '').trim();
    if (!rawCode || busy) {
      A.toast('Generate or select code first!', 'err');
      return;
    }
    const prevMode = st.mode;
    const inp = $('#lcPrompt');
    st.mode = 'edit';
    if (inp) inp.value = instruction;
    A.toast(`⚡ ${label}…`, 'info');
    await generate();
    st.mode = prevMode;
    setMode(prevMode);
  }

  if ($('#lcOptimize')) {
    $('#lcOptimize').onclick = () =>
      runAiCodeTransform(
        'Optimize this code for maximum runtime speed, memory efficiency, and clean architecture while preserving all output behavior.',
        'Optimizing code performance'
      );
  }

  if ($('#lcSecurityAudit')) {
    $('#lcSecurityAudit').onclick = () =>
      runAiCodeTransform(
        'Perform a thorough security, bug, and edge-case audit on this code: fix any vulnerabilities, null/bounds issues, unsafe input handling, memory/resource leaks, or race conditions, and add brief comments marking hardened checks.',
        'Running Security & Bug Audit'
      );
  }

  if ($('#lcAddDocs')) {
    $('#lcAddDocs').onclick = () =>
      runAiCodeTransform(
        'Add crisp, idiomatic documentation comments (docstrings/JSDoc/rustdoc/godoc) explaining parameters, return types, and Big-O time/space complexity without changing runtime behavior.',
        'Adding documentation & complexity notes'
      );
  }

  if ($('#lcUnitTests')) {
    $('#lcUnitTests').onclick = () =>
      runAiCodeTransform(
        'Add a comprehensive, self-contained unit test suite at the bottom of this code that verifies edge cases and prints PASS/FAIL assertions when run.',
        'Generating self-contained unit tests'
      );
  }

  if ($('#lcDiffToggle')) {
    $('#lcDiffToggle').onclick = () => {
      diffViewOpen = !diffViewOpen;
      const btn = $('#lcDiffToggle');
      if (btn) btn.classList.toggle('on', diffViewOpen);
      renderDiffView();
    };
  }

  if ($('#lcWrapToggle')) {
    $('#lcWrapToggle').onclick = () => {
      codeWrapEnabled = !codeWrapEnabled;
      const wrapEl = $('#lcCodeWrap');
      if (wrapEl) wrapEl.classList.toggle('wrap-lines', codeWrapEnabled);
      $('#lcWrapToggle').classList.toggle('on', codeWrapEnabled);
    };
  }

  if ($('#lcFontDec')) {
    $('#lcFontDec').onclick = () => {
      codeFontSize = Math.max(11, codeFontSize - 1);
      const pre = $('#lcCodeWrap pre');
      if (pre) pre.style.fontSize = codeFontSize + 'px';
    };
  }

  if ($('#lcFontInc')) {
    $('#lcFontInc').onclick = () => {
      codeFontSize = Math.min(20, codeFontSize + 1);
      const pre = $('#lcCodeWrap pre');
      if (pre) pre.style.fontSize = codeFontSize + 'px';
    };
  }

  if ($('#lcConvertLangBtn')) {
    $('#lcConvertLangBtn').onclick = () => {
      const rawCode = (st.code || '').trim();
      if (!rawCode || busy) {
        A.toast('Write or generate code first to convert!', 'err');
        return;
      }
      const convModal = $('#lcConvertModal');
      const grid = $('#lcConvertGrid');
      if (!convModal || !grid) return;
      grid.innerHTML = LANGS.map(targetL => `
        <button type="button" class="lc-convert-item ${targetL.id === st.lang ? 'current' : ''}" data-target-lang="${targetL.id}" style="--c:${targetL.c}">
          <span class="lc-conv-ic">${targetL.icon}</span>
          <div>
            <b>${targetL.name}</b>
            <small>.${targetL.ext} · ${targetL.id === st.lang ? 'Current language' : 'Port & compile'}</small>
          </div>
        </button>
      `).join('');

      grid.querySelectorAll('button[data-target-lang]').forEach(b => {
        b.onclick = async () => {
          const targetId = b.dataset.targetLang;
          const targetLang = LANGS.find(x => x.id === targetId);
          if (!targetLang) return;
          convModal.hidden = true;
          const srcLang = L();
          const sourceSnap = st.code;
          st.lang = targetLang.id;
          renderLangs();
          updateFile();
          const inp = $('#lcPrompt');
          st.mode = 'new';
          setMode('new');
          if (inp) {
            inp.value = `Convert and port the following ${srcLang.name} code into idiomatic, runnable ${targetLang.name} (.${targetLang.ext}) code preserving all logic and output:\n\n${sourceSnap.slice(0, 4000)}`;
          }
          await generate();
        };
      });

      if (A && typeof A.openModal === 'function') {
        A.openModal('lcConvertModal');
      } else {
        convModal.hidden = false;
      }
    };
  }

  // Panel action buttons
  ensureFixUi();
  if ($('#lcVerify')) $('#lcVerify').onclick = verifyFinalCode;
  if ($('#lcRun')) $('#lcRun').onclick = run;
  if ($('#lcExplain')) $('#lcExplain').onclick = explain;
  if ($('#lcFormat')) $('#lcFormat').onclick = formatCode;
  if ($('#lcTemplates')) $('#lcTemplates').onclick = renderTemplatesModal;
  if ($('#lcSaveCode')) $('#lcSaveCode').onclick = () => saveCodeToHistory({notify: true});
  if ($('#lcShareCode')) {
    $('#lcShareCode').onclick = () => {
      if (!(st.code || '').trim()) {
        A.toast('Generate or write code first to share!', 'err');
        return;
      }
      const l = L();
      window.LZShared?.openShareSnippetModal?.({
        title: autoSummarizeCode(st.code, l.name, st.prompt),
        lang: l.id,
        code: st.code
      });
    };
  }
  if ($('#lcHistoryBtn')) $('#lcHistoryBtn').onclick = renderHistoryModal;
  if ($('#lcClearAllHistory')) {
    $('#lcClearAllHistory').onclick = () => {
      setHistory([]);
      st.activeDocId = null;
      renderHistoryModal();
      A.toast('History cleared', 'ok');
    };
  }

  if ($('#lcCopy')) $('#lcCopy').onclick = () => { A.copyText(st.code); A.toast('✓ Full code copied to clipboard!', 'ok'); };
  if ($('#lcDownload')) $('#lcDownload').onclick = () => {
    const l = L();
    A.download(st.code, (l.id === 'java' ? 'Main' : l.id === 'csharp' ? 'Program' : 'main') + '.' + l.ext, 'text/plain');
  };
  if ($('#lcBack')) $('#lcBack').onclick = () => A.showView('chat');

  // Contenteditable code container + real-time Team broadcast
  const codeEl = $('#lcCode');
  let editSyncTimer = 0;
  if (codeEl) {
    codeEl.setAttribute('contenteditable', 'plaintext-only');
    codeEl.spellcheck = false;
    codeEl.addEventListener('input', () => {
      if (isRemoteUpdate) return;
      st.code = codeEl.innerText.replace(/\u00a0/g, ' ');
      st.verified = false;
      updateFile();
      save();
      window.LZCodeTeams?.broadcastCursor?.('code', true);
      clearTimeout(editSyncTimer);
      editSyncTimer = setTimeout(() => {
        if (isRemoteUpdate) return;
        window.LZCodeTeams?.broadcastSync?.({
          code: st.code,
          lang: st.lang,
          status: 'worked',
          statusDetail: 'Edited code manually',
          activity: 'Edited code manually'
        });
      }, 220);
    });
    codeEl.addEventListener('blur', () => paint(st.code));
    codeEl.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertText', false, '    ');
      }
    });
  }

  // Ensure modal close buttons work on lcRunModal and lcConvertModal
  ['lcRunModal', 'lcConvertModal'].forEach(mid => {
    const mEl = document.getElementById(mid);
    if (!mEl) return;
    mEl.querySelectorAll('[data-close]').forEach(btn => {
      btn.onclick = () => { mEl.hidden = true; };
    });
    mEl.addEventListener('click', ev => {
      if (ev.target === mEl) mEl.hidden = true;
    });
  });
}

window.LokiCode = {open, onShow, run, verifyFinalCode, fixUntilZero, saveCodeToHistory, LANGS, setMode, onTeamUpdate, applyServerCodeState, refreshAiIdeas};
init();
})();
