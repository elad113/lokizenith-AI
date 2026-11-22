/* Lokizenith Formula Calculator — instant engine. Made by Lokiz Studios.
   1) Built-in library of common formulas (0 network, < 1 ms)
   2) Typed formulas like "A = P(1 + r/n)^(nt)" are parsed locally into a live calculator
   3) AI-made formulas are cached (localStorage), so repeats are instant
   Works in the browser (window.FormulaFast) and in Node (module.exports) for tests. */
(function (root) {
  'use strict';
  // [id, keywords regex source, title, domain, latex, expressionText, resultLabel, unit, vars, js]
  // vars: "sym|label|unit|default|min|max|step;..."
  const L = [
    ['kinetic', 'kinetic energy|אנרגיה קינטית', 'Kinetic Energy', 'Physics', 'E_k = \\frac{1}{2} m v^2', 'Ek = 0.5 * m * v^2', 'Kinetic energy', 'J', 'm|Mass|kg|10|0|1000|0.1;v|Velocity|m/s|5|0|300|0.1', '0.5 * m * v ** 2'],
    ['potential', 'potential energy|gravitational potential energy|אנרגיה פוטנציאלית', 'Gravitational Potential Energy', 'Physics', 'E_p = m g h', 'Ep = m * g * h', 'Potential energy', 'J', 'm|Mass|kg|10|0|1000|0.1;g|Gravity|m/s²|9.81|0|30|0.01;h|Height|m|5|0|1000|0.1', 'm * g * h'],
    ['newton2', "newton[’']?s second law|force equals mass|f\\s*=\\s*m\\s*\\*?\\s*a\\b|החוק השני של ניוטון", "Newton's Second Law", 'Physics', 'F = m a', 'F = m * a', 'Force', 'N', 'm|Mass|kg|10|0|1000|0.1;a|Acceleration|m/s²|9.81|-100|100|0.01', 'm * a'],
    ['gravity', "universal gravitation|newton[’']?s law of gravit|gravitational force|כוח הכבידה", 'Newton’s Law of Universal Gravitation', 'Physics', 'F = G \\frac{m_1 m_2}{r^2}', 'F = G * m1 * m2 / r^2', 'Gravitational force', 'N', 'm1|Mass 1|kg|5.97e24|0|1e30|1e22;m2|Mass 2|kg|7.35e22|0|1e30|1e20;r|Distance|m|3.84e8|1|1e12|1e6', '6.674e-11 * m1 * m2 / r ** 2'],
    ['ohm', "ohm[’']?s law|voltage current resistance|חוק אוהם", 'Ohm’s Law', 'Electronics', 'V = I R', 'V = I * R', 'Voltage', 'V', 'I|Current|A|2|0|100|0.01;R|Resistance|Ω|10|0|10000|0.1', 'I * R'],
    ['power_el', 'electrical power|electric power|הספק חשמלי', 'Electrical Power', 'Electronics', 'P = V I', 'P = V * I', 'Power', 'W', 'V|Voltage|V|230|0|1000|1;I|Current|A|2|0|100|0.01', 'V * I'],
    ['compound', 'compound interest|ריבית דריבית', 'Compound Interest', 'Finance', 'A = P\\left(1 + \\frac{r}{n}\\right)^{n t}', 'A = P * (1 + r/n)^(n*t)', 'Final amount', '$', 'P|Principal|$|10000|0|1000000|100;r|Annual rate (decimal)||0.05|0|0.5|0.001;n|Compounds per year||12|1|365|1;t|Years|years|10|0|60|1', 'P * (1 + r / n) ** (n * t)'],
    ['simple_int', 'simple interest|ריבית פשוטה', 'Simple Interest', 'Finance', 'I = P r t', 'I = P * r * t', 'Interest', '$', 'P|Principal|$|10000|0|1000000|100;r|Annual rate (decimal)||0.05|0|0.5|0.001;t|Years|years|5|0|60|1', 'P * r * t'],
    ['loan', 'loan payment|mortgage payment|monthly payment|amortization|החזר חודשי|משכנתא', 'Loan / Mortgage Monthly Payment', 'Finance', 'M = P \\frac{i(1+i)^n}{(1+i)^n - 1}', 'M = P * i(1+i)^n / ((1+i)^n - 1), i = rate/12, n = years*12', 'Monthly payment', '$', 'P|Loan amount|$|300000|0|5000000|1000;rate|Annual rate (decimal)||0.05|0.0001|0.3|0.001;years|Term|years|30|1|40|1', '(rate / 12 === 0 ? P / (years * 12) : P * (rate / 12) * (1 + rate / 12) ** (years * 12) / ((1 + rate / 12) ** (years * 12) - 1))'],
    ['bmi', 'bmi|body mass index|מדד מסת גוף', 'Body Mass Index (BMI)', 'Health', 'BMI = \\frac{m}{h^2}', 'BMI = m / h^2', 'BMI', 'kg/m²', 'm|Weight|kg|70|20|250|0.5;h|Height|m|1.75|1|2.3|0.01', 'm / h ** 2'],
    ['quadratic', 'quadratic (formula|equation|root)|נוסחת השורשים|משוואה ריבועית', 'Quadratic Formula (positive root)', 'Math', 'x = \\frac{-b + \\sqrt{b^2 - 4ac}}{2a}', 'x = (-b + sqrt(b^2 - 4ac)) / (2a)', 'Root x₁', '', 'a|a||1|-20|20|0.1;b|b||-5|-50|50|0.1;c|c||6|-100|100|0.1', '(-b + Math.sqrt(b ** 2 - 4 * a * c)) / (2 * a)'],
    ['pythag', 'pythag|hypotenuse|פיתגורס|יתר', 'Pythagorean Theorem', 'Math', 'c = \\sqrt{a^2 + b^2}', 'c = sqrt(a^2 + b^2)', 'Hypotenuse', '', 'a|Side a||3|0|1000|0.1;b|Side b||4|0|1000|0.1', 'Math.hypot(a, b)'],
    ['circle_area', 'area of (a )?circle|circle area|שטח מעגל', 'Area of a Circle', 'Math', 'A = \\pi r^2', 'A = π * r^2', 'Area', 'units²', 'r|Radius|units|5|0|1000|0.1', 'Math.PI * r ** 2'],
    ['circumference', 'circumference|היקף מעגל', 'Circumference of a Circle', 'Math', 'C = 2 \\pi r', 'C = 2π * r', 'Circumference', 'units', 'r|Radius|units|5|0|1000|0.1', '2 * Math.PI * r'],
    ['sphere_vol', 'volume of (a )?sphere|sphere volume|נפח כדור', 'Volume of a Sphere', 'Math', 'V = \\frac{4}{3} \\pi r^3', 'V = 4/3 * π * r^3', 'Volume', 'units³', 'r|Radius|units|5|0|1000|0.1', '4 / 3 * Math.PI * r ** 3'],
    ['cyl_vol', 'volume of (a )?cylinder|cylinder volume|נפח גליל', 'Volume of a Cylinder', 'Math', 'V = \\pi r^2 h', 'V = π * r^2 * h', 'Volume', 'units³', 'r|Radius|units|3|0|1000|0.1;h|Height|units|10|0|1000|0.1', 'Math.PI * r ** 2 * h'],
    ['cone_vol', 'volume of (a )?cone|cone volume|נפח חרוט', 'Volume of a Cone', 'Math', 'V = \\frac{1}{3} \\pi r^2 h', 'V = 1/3 * π * r^2 * h', 'Volume', 'units³', 'r|Radius|units|3|0|1000|0.1;h|Height|units|10|0|1000|0.1', 'Math.PI * r ** 2 * h / 3'],
    ['triangle_area', 'area of (a )?triangle|triangle area|שטח משולש', 'Area of a Triangle', 'Math', 'A = \\frac{1}{2} b h', 'A = 0.5 * b * h', 'Area', 'units²', 'b|Base|units|6|0|1000|0.1;h|Height|units|4|0|1000|0.1', '0.5 * b * h'],
    ['ideal_gas', 'ideal gas|pv\\s*=\\s*nrt|חוק הגזים', 'Ideal Gas Law (pressure)', 'Chemistry', 'P = \\frac{n R T}{V}', 'P = n * R * T / V', 'Pressure', 'Pa', 'n|Amount|mol|1|0|100|0.01;T|Temperature|K|298|1|2000|1;V|Volume|m³|0.0224|0.0001|10|0.0001', 'n * 8.314462618 * T / V'],
    ['projectile', 'projectile (range|motion)|horizontal range|טווח זריקה|זריקה משופעת', 'Projectile Horizontal Range', 'Physics', 'R = \\frac{v^2 \\sin(2\\theta)}{g}', 'R = v^2 * sin(2θ) / g', 'Range', 'm', 'v|Launch speed|m/s|20|0|500|0.1;theta|Angle|°|45|0|90|1;g|Gravity|m/s²|9.81|0.1|30|0.01', 'v ** 2 * Math.sin(2 * theta * Math.PI / 180) / g'],
    ['free_fall', 'free fall|falling object|נפילה חופשית', 'Free Fall Distance', 'Physics', 'd = \\frac{1}{2} g t^2', 'd = 0.5 * g * t^2', 'Distance fallen', 'm', 'g|Gravity|m/s²|9.81|0|30|0.01;t|Time|s|3|0|100|0.1', '0.5 * g * t ** 2'],
    ['velocity', 'average (speed|velocity)|speed (equals|=) distance|מהירות ממוצעת', 'Average Speed', 'Physics', 'v = \\frac{d}{t}', 'v = d / t', 'Speed', 'm/s', 'd|Distance|m|100|0|100000|1;t|Time|s|9.58|0.01|100000|0.01', 'd / t'],
    ['momentum', 'momentum|תנע', 'Momentum', 'Physics', 'p = m v', 'p = m * v', 'Momentum', 'kg·m/s', 'm|Mass|kg|10|0|10000|0.1;v|Velocity|m/s|5|-300|300|0.1', 'm * v'],
    ['work', 'work done|work formula|עבודה מכנית', 'Work', 'Physics', 'W = F d \\cos\\theta', 'W = F * d * cos(θ)', 'Work', 'J', 'F|Force|N|50|0|10000|1;d|Distance|m|10|0|10000|0.1;theta|Angle|°|0|0|180|1', 'F * d * Math.cos(theta * Math.PI / 180)'],
    ['pendulum', 'pendulum period|period of (a )?pendulum|מטוטלת', 'Simple Pendulum Period', 'Physics', 'T = 2\\pi \\sqrt{\\frac{L}{g}}', 'T = 2π * sqrt(L / g)', 'Period', 's', 'L|Length|m|1|0.01|100|0.01;g|Gravity|m/s²|9.81|0.1|30|0.01', '2 * Math.PI * Math.sqrt(L / g)'],
    ['centripetal', 'centripetal|כוח צנטריפטלי', 'Centripetal Force', 'Physics', 'F = \\frac{m v^2}{r}', 'F = m * v^2 / r', 'Centripetal force', 'N', 'm|Mass|kg|2|0|1000|0.1;v|Speed|m/s|10|0|300|0.1;r|Radius|m|5|0.01|1000|0.1', 'm * v ** 2 / r'],
    ['emc2', 'e\\s*=\\s*mc\\^?2|mass.energy equivalence|einstein', 'Mass–Energy Equivalence', 'Physics', 'E = m c^2', 'E = m * c^2', 'Energy', 'J', 'm|Mass|kg|1|0|1000|0.001', 'm * 299792458 ** 2'],
    ['lorentz', 'lorentz factor|time dilation|גורם לורנץ', 'Lorentz Factor γ', 'Physics', '\\gamma = \\frac{1}{\\sqrt{1 - v^2/c^2}}', 'γ = 1 / sqrt(1 - v^2/c^2)', 'Lorentz factor γ', '', 'v|Speed (fraction of c)|c|0.8|0|0.9999|0.0001', '1 / Math.sqrt(1 - v ** 2)'],
    ['density', 'density formula|density|צפיפות', 'Density', 'Physics', '\\rho = \\frac{m}{V}', 'ρ = m / V', 'Density', 'kg/m³', 'm|Mass|kg|1000|0|100000|1;V|Volume|m³|1|0.0001|1000|0.01', 'm / V'],
    ['pressure', 'pressure formula|pressure = force|לחץ', 'Pressure', 'Physics', 'P = \\frac{F}{A}', 'P = F / A', 'Pressure', 'Pa', 'F|Force|N|100|0|100000|1;A|Area|m²|0.5|0.0001|1000|0.01', 'F / A'],
    ['wave', 'wave speed|wavelength frequency|מהירות גל', 'Wave Speed', 'Physics', 'v = f \\lambda', 'v = f * λ', 'Wave speed', 'm/s', 'f|Frequency|Hz|440|0|1e6|1;lambda|Wavelength|m|0.78|0|1000|0.01', 'f * lambda'],
    ['photon', 'photon energy|planck|e\\s*=\\s*hf', 'Photon Energy', 'Physics', 'E = h f', 'E = h * f', 'Energy', 'J', 'f|Frequency|Hz|5e14|0|1e20|1e12', '6.62607015e-34 * f'],
    ['coulomb', "coulomb[’']?s law|electrostatic force|חוק קולון", 'Coulomb’s Law', 'Physics', 'F = k \\frac{q_1 q_2}{r^2}', 'F = k * q1 * q2 / r^2', 'Electric force', 'N', 'q1|Charge 1|C|1e-6|-1|1|1e-7;q2|Charge 2|C|1e-6|-1|1|1e-7;r|Distance|m|0.1|0.0001|100|0.001', '8.9875517923e9 * q1 * q2 / r ** 2'],
    ['doppler', 'doppler', 'Doppler Shift (moving source)', 'Physics', "f' = f \\frac{v}{v - v_s}", "f' = f * v / (v - vs)", 'Observed frequency', 'Hz', 'f|Source frequency|Hz|440|1|20000|1;v|Speed of sound|m/s|343|1|2000|1;vs|Source speed (toward)|m/s|30|-300|300|1', 'f * v / (v - vs)'],
    ['heat', 'specific heat|heat energy|q\\s*=\\s*mc\\s*Δ?t|חום סגולי', 'Heat Energy (Q = mcΔT)', 'Physics', 'Q = m c \\Delta T', 'Q = m * c * ΔT', 'Heat', 'J', 'm|Mass|kg|1|0|1000|0.1;c|Specific heat|J/(kg·K)|4186|1|10000|1;dT|Temperature change|K|10|-500|500|1', 'm * c * dT'],
    ['c2f', 'celsius to fahrenheit|צלזיוס לפרנהייט', 'Celsius → Fahrenheit', 'General', 'F = \\frac{9}{5} C + 32', 'F = 9/5 * C + 32', 'Fahrenheit', '°F', 'C|Celsius|°C|25|-100|300|0.5', 'C * 9 / 5 + 32'],
    ['f2c', 'fahrenheit to celsius|פרנהייט לצלזיוס', 'Fahrenheit → Celsius', 'General', 'C = \\frac{5}{9}(F - 32)', 'C = 5/9 * (F - 32)', 'Celsius', '°C', 'F|Fahrenheit|°F|77|-150|600|0.5', '(F - 32) * 5 / 9'],
    ['percent_change', 'percent(age)? change|percentage increase|שינוי באחוזים', 'Percentage Change', 'General', '\\% = \\frac{new - old}{old} \\times 100', '% = (new - old) / old * 100', 'Change', '%', 'old|Old value||80|0.0001|1e6|1;new_|New value||100|0|1e6|1', '(new_ - old) / old * 100'],
    ['tip', 'tip calculator|tip per person|טיפ', 'Tip Split', 'General', 'T = \\frac{B (1 + p)}{n}', 'per person = bill * (1 + tip) / people', 'Per person', '$', 'B|Bill|$|120|0|10000|1;p|Tip (decimal)||0.15|0|0.5|0.01;n|People||4|1|50|1', 'B * (1 + p) / n'],
    ['roi', '\\broi\\b|return on investment|תשואה על השקעה', 'Return on Investment', 'Finance', 'ROI = \\frac{G - C}{C} \\times 100', 'ROI = (gain - cost) / cost * 100', 'ROI', '%', 'G|Final value|$|15000|0|1e7|100;C|Cost|$|10000|1|1e7|100', '(G - C) / C * 100'],
    ['future_value', 'future value|savings with monthly contribution|monthly contribution|חיסכון חודשי', 'Future Value with Monthly Contributions', 'Finance', 'FV = P(1+i)^{n} + PMT \\frac{(1+i)^{n} - 1}{i}', 'FV = P(1+i)^n + PMT * ((1+i)^n - 1)/i, i = rate/12, n = years*12', 'Future value', '$', 'P|Starting amount|$|5000|0|1e7|100;PMT|Monthly contribution|$|300|0|100000|10;rate|Annual rate (decimal)||0.07|0.0001|0.5|0.001;years|Years|years|20|1|60|1', 'P * (1 + rate / 12) ** (years * 12) + PMT * ((1 + rate / 12) ** (years * 12) - 1) / (rate / 12)'],
    ['cagr', '\\bcagr\\b|compound annual growth', 'Compound Annual Growth Rate', 'Finance', 'CAGR = \\left(\\frac{E}{B}\\right)^{1/n} - 1', 'CAGR = (end / begin)^(1/n) - 1', 'CAGR', '%', 'B|Beginning value|$|10000|1|1e8|100;E|Ending value|$|20000|1|1e8|100;n|Years|years|5|1|100|1', '((E / B) ** (1 / n) - 1) * 100'],
    ['bmr', '\\bbmr\\b|basal metabolic|mifflin|calories burned at rest', 'Basal Metabolic Rate (Mifflin–St Jeor, male)', 'Health', 'BMR = 10m + 6.25h - 5a + 5', 'BMR = 10*weight + 6.25*height - 5*age + 5', 'BMR', 'kcal/day', 'm|Weight|kg|75|30|250|0.5;h|Height|cm|178|100|230|1;a|Age|years|30|10|100|1', '10 * m + 6.25 * h - 5 * a + 5'],
    ['resistors_par', 'parallel resistors|resistors in parallel|נגדים במקביל', 'Two Resistors in Parallel', 'Electronics', 'R = \\frac{R_1 R_2}{R_1 + R_2}', 'R = R1 * R2 / (R1 + R2)', 'Equivalent resistance', 'Ω', 'R1|R1|Ω|100|0.1|1e6|1;R2|R2|Ω|220|0.1|1e6|1', 'R1 * R2 / (R1 + R2)'],
    ['rc', 'rc time constant|time constant', 'RC Time Constant', 'Electronics', '\\tau = R C', 'τ = R * C', 'Time constant', 's', 'R|Resistance|Ω|10000|1|1e7|100;C|Capacitance|F|0.0001|1e-12|1|1e-6', 'R * C'],
    ['slope', 'slope (of a line|formula)|שיפוע', 'Slope Between Two Points', 'Math', 'm = \\frac{y_2 - y_1}{x_2 - x_1}', 'm = (y2 - y1) / (x2 - x1)', 'Slope', '', 'x1|x₁||0|-100|100|1;y1|y₁||0|-100|100|1;x2|x₂||4|-100|100|1;y2|y₂||3|-100|100|1', '(y2 - y1) / (x2 - x1)'],
    ['distance2d', 'distance between two points|distance formula|מרחק בין נקודות', 'Distance Between Two Points', 'Math', 'd = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}', 'd = sqrt((x2-x1)^2 + (y2-y1)^2)', 'Distance', '', 'x1|x₁||0|-100|100|1;y1|y₁||0|-100|100|1;x2|x₂||3|-100|100|1;y2|y₂||4|-100|100|1', 'Math.hypot(x2 - x1, y2 - y1)'],
    ['exp_growth', 'exponential growth|population growth|גדילה מעריכית', 'Exponential Growth', 'Math', 'N = N_0 e^{r t}', 'N = N0 * e^(r*t)', 'Amount', '', 'N0|Initial amount||100|0|1e9|1;r|Growth rate||0.05|-1|1|0.001;t|Time||10|0|1000|1', 'N0 * Math.exp(r * t)'],
    ['half_life', 'half.life|radioactive decay|זמן מחצית', 'Radioactive Decay (half-life)', 'Chemistry', 'N = N_0 \\left(\\frac{1}{2}\\right)^{t/T}', 'N = N0 * (1/2)^(t / T)', 'Remaining amount', '', 'N0|Initial amount||100|0|1e9|1;t|Elapsed time||10|0|1e6|1;T|Half-life||5.27|0.001|1e6|0.01', 'N0 * 0.5 ** (t / T)'],
    ['ph', '\\bph\\b (of|formula|from)|ph calculator', 'pH from Hydrogen-ion Concentration', 'Chemistry', 'pH = -\\log_{10}[H^+]', 'pH = -log10([H+])', 'pH', '', 'H|[H⁺] concentration|mol/L|1e-7|1e-14|1|1e-8', '-Math.log10(H)'],
    ['dilution', 'dilution|c1v1|ריכוז', 'Dilution (C₁V₁ = C₂V₂)', 'Chemistry', 'V_2 = \\frac{C_1 V_1}{C_2}', 'V2 = C1 * V1 / C2', 'Final volume', 'L', 'C1|Initial concentration|M|2|0|100|0.01;V1|Initial volume|L|0.5|0|100|0.01;C2|Final concentration|M|0.5|0.0001|100|0.01', 'C1 * V1 / C2'],
    ['fuel', 'fuel (cost|consumption)|trip cost|עלות דלק', 'Trip Fuel Cost', 'General', 'Cost = \\frac{d}{100} \\cdot c \\cdot p', 'cost = distance/100 * L/100km * price', 'Fuel cost', '$', 'd|Distance|km|300|0|10000|1;c|Consumption|L/100km|7|1|40|0.1;p|Fuel price|$/L|1.8|0|10|0.01', 'd / 100 * c * p'],
    // ---- 2.9.3 additions (instant, no AI round-trip) ----
    ['bernoulli', 'bernoulli|ברנולי', 'Bernoulli Equation (pressure at point 2)', 'Physics', 'P_2 = P_1 + \\frac{1}{2}\\rho (v_1^2 - v_2^2) + \\rho g (h_1 - h_2)', 'P2 = P1 + 0.5 * rho * (v1^2 - v2^2) + rho * g * (h1 - h2)', 'Pressure P₂', 'Pa', 'P1|Pressure P₁|Pa|101325|0|1000000|100;rho|Fluid density|kg/m³|1000|0.1|20000|1;v1|Speed v₁|m/s|2|0|100|0.1;v2|Speed v₂|m/s|4|0|100|0.1;h1|Height h₁|m|5|-100|1000|0.1;h2|Height h₂|m|0|-100|1000|0.1;g|Gravity|m/s²|9.81|0|30|0.01', 'P1 + 0.5 * rho * (v1 ** 2 - v2 ** 2) + rho * g * (h1 - h2)'],
    ['reynolds', 'reynolds|מספר ריינולדס', 'Reynolds Number (pipe flow)', 'Engineering', 'Re = \\frac{\\rho v D}{\\mu}', 'Re = rho * v * D / mu', 'Reynolds number', '', 'rho|Density|kg/m³|1000|0.1|20000|1;v|Velocity|m/s|1.5|0|100|0.1;D|Pipe diameter|m|0.05|0.001|10|0.001;mu|Dynamic viscosity|Pa·s|0.001|1e-6|10|0.0001', 'rho * v * D / mu'],
    ['escape', 'escape velocity|מהירות מילוט', 'Escape Velocity', 'Physics', 'v_e = \\sqrt{\\frac{2 G M}{r}}', 've = sqrt(2 * G * M / r)', 'Escape velocity', 'm/s', 'M|Planet mass|kg|5.972e24|1e20|2e30|1e22;r|Radius|m|6371000|1000|1e9|1000', 'Math.sqrt(2 * 6.674e-11 * M / r)'],
    ['orbital', 'orbital (velocity|speed)|מהירות מסלולית', 'Circular Orbital Speed', 'Physics', 'v = \\sqrt{\\frac{G M}{r}}', 'v = sqrt(G * M / r)', 'Orbital speed', 'm/s', 'M|Central mass|kg|5.972e24|1e20|2e30|1e22;r|Orbit radius|m|6771000|1000|1e10|1000', 'Math.sqrt(6.674e-11 * M / r)'],
    ['kepler3', "kepler[’']?s third law|orbital period|זמן מחזור מסלול", 'Orbital Period (Kepler III)', 'Physics', 'T = 2\\pi \\sqrt{\\frac{a^3}{G M}}', 'T = 2π * sqrt(a^3 / (G * M))', 'Period', 's', 'a|Semi-major axis|m|6771000|1000|1e13|1000;M|Central mass|kg|5.972e24|1e20|2e31|1e22', '2 * Math.PI * Math.sqrt(a ** 3 / (6.674e-11 * M))'],
    ['rc_charge', 'rc (circuit )?(charging|voltage)|capacitor (charging|voltage)|טעינת קבל', 'RC Circuit — Capacitor Charging Voltage', 'Electronics', 'V_C = V_0 \\left(1 - e^{-t / RC}\\right)', 'Vc = V0 * (1 - e^(-t / (R*C)))', 'Capacitor voltage', 'V', 'V0|Supply voltage|V|5|0|1000|0.1;t|Time|s|0.5|0|100|0.01;R|Resistance|Ω|10000|1|1e7|100;C|Capacitance|F|0.0001|1e-12|1|1e-6', 'V0 * (1 - Math.exp(-t / (R * C)))'],
    ['cap_energy', 'capacitor energy|energy (stored )?in a capacitor|אנרגיה בקבל', 'Energy Stored in a Capacitor', 'Electronics', 'E = \\frac{1}{2} C V^2', 'E = 0.5 * C * V^2', 'Energy', 'J', 'C|Capacitance|F|0.001|1e-12|10|1e-6;V|Voltage|V|12|0|10000|0.1', '0.5 * C * V ** 2'],
    ['resistors_ser', 'resistors in series|series resistance|נגדים בטור', 'Resistors in Series (3)', 'Electronics', 'R = R_1 + R_2 + R_3', 'R = R1 + R2 + R3', 'Total resistance', 'Ω', 'R1|R₁|Ω|100|0|1e6|1;R2|R₂|Ω|220|0|1e6|1;R3|R₃|Ω|330|0|1e6|1', 'R1 + R2 + R3'],
    ['voltage_div', 'voltage divider|מחלק מתח', 'Voltage Divider', 'Electronics', 'V_{out} = V_{in} \\frac{R_2}{R_1 + R_2}', 'Vout = Vin * R2 / (R1 + R2)', 'Output voltage', 'V', 'Vin|Input voltage|V|12|0|1000|0.1;R1|R₁|Ω|1000|1|1e7|1;R2|R₂|Ω|2000|1|1e7|1', 'Vin * R2 / (R1 + R2)'],
    ['power_ir', 'power (from|with) (current and resistance|i and r)|joule heating|P\\s*=\\s*I\\^?2\\s*R', 'Power from Current & Resistance', 'Electronics', 'P = I^2 R', 'P = I^2 * R', 'Power', 'W', 'I|Current|A|2|0|1000|0.01;R|Resistance|Ω|10|0|1e6|0.1', 'I ** 2 * R'],
    ['snell', "snell[’']?s law|refraction angle|חוק סנל|שבירת אור", 'Snell’s Law (refraction angle)', 'Physics', '\\theta_2 = \\arcsin\\left(\\frac{n_1 \\sin\\theta_1}{n_2}\\right)', 'θ2 = asin(n1 * sin(θ1) / n2)', 'Refraction angle', '°', 'n1|Index n₁||1|1|3|0.01;theta1|Incidence angle|°|30|0|90|0.5;n2|Index n₂||1.5|1|3|0.01', 'Math.asin(n1 * Math.sin(theta1 * Math.PI / 180) / n2) * 180 / Math.PI'],
    ['lens', 'thin lens|lens (equation|formula)|image distance|נוסחת העדשה', 'Thin Lens Equation (image distance)', 'Physics', '\\frac{1}{f} = \\frac{1}{d_o} + \\frac{1}{d_i}', 'di = 1 / (1/f - 1/do)', 'Image distance', 'cm', 'f|Focal length|cm|10|-1000|1000|0.1;d_o|Object distance|cm|30|0.1|10000|0.1', '1 / (1 / f - 1 / d_o)'],
    ['hooke', "hooke[’']?s law|spring force|חוק הוק", 'Hooke’s Law', 'Physics', 'F = k x', 'F = k * x', 'Spring force', 'N', 'k|Spring constant|N/m|200|0|100000|1;x|Extension|m|0.1|-10|10|0.01', 'k * x'],
    ['spring_pe', 'spring (potential )?energy|elastic potential energy|אנרגיה אלסטית', 'Elastic Potential Energy', 'Physics', 'E = \\frac{1}{2} k x^2', 'E = 0.5 * k * x^2', 'Energy', 'J', 'k|Spring constant|N/m|200|0|100000|1;x|Extension|m|0.1|-10|10|0.01', '0.5 * k * x ** 2'],
    ['power_mech', 'mechanical power|power = work|הספק מכני', 'Mechanical Power', 'Physics', 'P = \\frac{W}{t}', 'P = W / t', 'Power', 'W', 'W|Work|J|1000|0|1e9|1;t|Time|s|10|0.001|1e6|0.1', 'W / t'],
    ['acceleration', 'acceleration (formula|from velocity)|תאוצה', 'Acceleration', 'Physics', 'a = \\frac{v - v_0}{t}', 'a = (v - v0) / t', 'Acceleration', 'm/s²', 'v|Final velocity|m/s|30|-1000|1000|0.1;v0|Initial velocity|m/s|0|-1000|1000|0.1;t|Time|s|5|0.001|10000|0.1', '(v - v0) / t'],
    ['suvat', 'displacement (with|under) (constant )?acceleration|kinematic(s)? equation|suvat|מיקום בתאוצה קבועה', 'Displacement under Constant Acceleration', 'Physics', 's = v_0 t + \\frac{1}{2} a t^2', 's = v0 * t + 0.5 * a * t^2', 'Displacement', 'm', 'v0|Initial velocity|m/s|5|-1000|1000|0.1;a|Acceleration|m/s²|2|-100|100|0.1;t|Time|s|10|0|10000|0.1', 'v0 * t + 0.5 * a * t ** 2'],
    ['friction', 'friction force|כוח חיכוך', 'Friction Force', 'Physics', 'F_f = \\mu N', 'Ff = μ * N', 'Friction force', 'N', 'mu|Friction coefficient||0.4|0|2|0.01;N|Normal force|N|100|0|1e6|1', 'mu * N'],
    ['torque', 'torque|מומנט', 'Torque', 'Physics', '\\tau = r F \\sin\\theta', 'τ = r * F * sin(θ)', 'Torque', 'N·m', 'r|Lever arm|m|0.5|0|100|0.01;F|Force|N|100|0|1e6|1;theta|Angle|°|90|0|180|1', 'r * F * Math.sin(theta * Math.PI / 180)'],
    ['buoyancy', 'buoyan(cy|t force)|archimedes|כוח עילוי|ארכימדס', 'Buoyant Force (Archimedes)', 'Physics', 'F_b = \\rho g V', 'Fb = ρ * g * V', 'Buoyant force', 'N', 'rho|Fluid density|kg/m³|1000|0.1|20000|1;V|Submerged volume|m³|0.01|0|1000|0.001;g|Gravity|m/s²|9.81|0|30|0.01', 'rho * g * V'],
    ['hydro', 'hydrostatic pressure|pressure at depth|לחץ הידרוסטטי', 'Hydrostatic Pressure', 'Physics', 'P = \\rho g h', 'P = ρ * g * h', 'Pressure', 'Pa', 'rho|Density|kg/m³|1000|0.1|20000|1;h|Depth|m|10|0|11000|0.1;g|Gravity|m/s²|9.81|0|30|0.01', 'rho * g * h'],
    ['decibel', 'decibel|sound (intensity )?level|דציבל', 'Sound Intensity Level', 'Physics', 'L = 10 \\log_{10}\\frac{I}{I_0}', 'L = 10 * log10(I / I0)', 'Sound level', 'dB', 'I|Intensity|W/m²|0.001|1e-12|100|1e-6', '10 * Math.log10(I / 1e-12)'],
    ['stefan', 'stefan.?boltzmann|black ?body radiation|קרינת גוף שחור', 'Stefan–Boltzmann Radiated Power', 'Physics', 'P = \\varepsilon \\sigma A T^4', 'P = ε * σ * A * T^4', 'Radiated power', 'W', 'eps|Emissivity||1|0|1|0.01;A|Area|m²|1|0|1e6|0.1;T|Temperature|K|300|0|10000|1', 'eps * 5.670374419e-8 * A * T ** 4'],
    ['wien', "wien[’']?s (displacement )?law|peak wavelength|חוק וין", 'Wien’s Displacement Law', 'Physics', '\\lambda_{max} = \\frac{b}{T}', 'λmax = b / T', 'Peak wavelength', 'nm', 'T|Temperature|K|5778|1|100000|1', '2.897771955e-3 / T * 1e9'],
    ['de_broglie', 'de ?broglie|matter wave|אורך גל דה ברויי', 'de Broglie Wavelength', 'Physics', '\\lambda = \\frac{h}{m v}', 'λ = h / (m * v)', 'Wavelength', 'm', 'm|Mass|kg|9.109e-31|1e-31|1000|1e-31;v|Velocity|m/s|1000000|1|3e8|1000', '6.62607015e-34 / (m * v)'],
    ['time_dilation', 'time dilation|התארכות זמן', 'Relativistic Time Dilation', 'Physics', '\\Delta t = \\frac{\\Delta t_0}{\\sqrt{1 - v^2/c^2}}', 'Δt = Δt0 / sqrt(1 - v^2/c^2)', 'Dilated time', 's', 'dt0|Proper time|s|1|0|1e9|0.1;v|Speed|m/s|200000000|0|299792457|1000000', 'dt0 / Math.sqrt(1 - (v / 299792458) ** 2)'],
    ['sound_speed', 'speed of sound (in air)?|מהירות הקול', 'Speed of Sound in Air', 'Physics', 'v \\approx 331.3 \\sqrt{1 + \\frac{T}{273.15}}', 'v = 331.3 * sqrt(1 + T/273.15)', 'Speed of sound', 'm/s', 'T|Air temperature|°C|20|-80|200|0.5', '331.3 * Math.sqrt(1 + T / 273.15)'],
    ['heat_cond', 'heat conduction|fourier[’\']?s law|thermal conduction|הולכת חום', 'Heat Conduction (Fourier)', 'Physics', 'Q/t = \\frac{k A \\Delta T}{d}', 'Q/t = k * A * ΔT / d', 'Heat flow', 'W', 'k|Conductivity|W/m·K|0.04|0.001|500|0.001;A|Area|m²|10|0|10000|0.1;dT|Temperature difference|K|20|0|2000|0.5;d|Thickness|m|0.1|0.001|10|0.001', 'k * A * dT / d'],
    ['efficiency', 'efficiency|נצילות', 'Efficiency', 'General', '\\eta = \\frac{E_{out}}{E_{in}} \\times 100', 'η = Eout / Ein * 100', 'Efficiency', '%', 'Eout|Useful output||75|0|1e9|1;Ein|Input||100|0.001|1e9|1', 'Eout / Ein * 100'],
    ['speed', 'average speed|speed (=|equals) distance|מהירות ממוצעת', 'Average Speed', 'Physics', 'v = \\frac{d}{t}', 'v = d / t', 'Speed', 'm/s', 'd|Distance|m|100|0|1e9|1;t|Time|s|9.58|0.001|1e7|0.01', 'd / t'],
    ['molarity', 'molarity|molar concentration|מולריות', 'Molarity', 'Chemistry', 'M = \\frac{n}{V}', 'M = n / V', 'Concentration', 'mol/L', 'n|Amount of solute|mol|0.5|0|1000|0.01;V|Solution volume|L|1|0.001|10000|0.01', 'n / V'],
    ['moles', 'number of moles|moles from mass|כמות חומר במול', 'Moles from Mass', 'Chemistry', 'n = \\frac{m}{M}', 'n = m / M', 'Amount', 'mol', 'm|Mass|g|18|0|1e6|0.1;M|Molar mass|g/mol|18.015|0.001|10000|0.01', 'm / M'],
    ['arrhenius', 'arrhenius|rate constant|קבוע קצב', 'Arrhenius Equation', 'Chemistry', 'k = A e^{-E_a / (R T)}', 'k = A * e^(-Ea / (R*T))', 'Rate constant', '1/s', 'A|Pre-exponential factor|1/s|1e13|1|1e20|1e10;Ea|Activation energy|J/mol|75000|0|1e6|100;T|Temperature|K|298|1|5000|1', 'A * Math.exp(-Ea / (8.314 * T))'],
    ['gibbs', 'gibbs free energy|אנרגיה חופשית', 'Gibbs Free Energy', 'Chemistry', '\\Delta G = \\Delta H - T \\Delta S', 'ΔG = ΔH - T * ΔS', 'ΔG', 'kJ/mol', 'dH|ΔH|kJ/mol|-92|-10000|10000|0.1;T|Temperature|K|298|0|5000|1;dS|ΔS|kJ/(mol·K)|-0.199|-10|10|0.001', 'dH - T * dS'],
    ['percent_of', 'percent(age)? of|what is \\d+ ?% of|אחוז מ', 'Percentage of a Value', 'General', 'y = \\frac{p}{100} x', 'y = p/100 * x', 'Result', '', 'p|Percent|%|15|0|1000|0.5;x|Value||200|0|1e9|1', 'p / 100 * x'],
    ['discount', 'discount|sale price|מחיר אחרי הנחה|הנחה', 'Price after Discount', 'Finance', 'P = P_0 (1 - d/100)', 'P = P0 * (1 - d/100)', 'Final price', '$', 'P0|Original price|$|120|0|1e7|1;d|Discount|%|25|0|100|1', 'P0 * (1 - d / 100)'],
    ['vat', '\\bvat\\b|sales tax|price with tax|מע"?מ', 'Price with VAT / Sales Tax', 'Finance', 'P = P_0 (1 + r/100)', 'P = P0 * (1 + r/100)', 'Price incl. tax', '$', 'P0|Net price|$|100|0|1e7|1;r|Tax rate|%|18|0|100|0.5', 'P0 * (1 + r / 100)'],
    ['inflation', 'inflation|purchasing power|אינפלציה|כוח קנייה', 'Purchasing Power after Inflation', 'Finance', 'V = \\frac{V_0}{(1 + i)^{t}}', 'V = V0 / (1 + i)^t', 'Real value', '$', 'V0|Amount today|$|1000|0|1e9|10;i|Inflation rate (decimal)||0.03|-0.5|2|0.001;t|Years|years|10|0|100|1', 'V0 / (1 + i) ** t'],
    ['savings', 'savings (plan|goal)|monthly (deposit|contribution|saving)|retirement savings|חיסכון חודשי', 'Savings with Monthly Contributions', 'Finance', 'FV = P(1+i)^n + c\\frac{(1+i)^n - 1}{i}', 'FV = P*(1+i)^n + c*((1+i)^n - 1)/i', 'Future value', '$', 'P|Starting amount|$|1000|0|1e9|100;c|Monthly deposit|$|200|0|1e7|10;r|Annual rate (decimal)||0.06|0.0001|1|0.001;y|Years|years|20|0|80|1', 'P * (1 + r / 12) ** (12 * y) + c * ((1 + r / 12) ** (12 * y) - 1) / (r / 12)'],
    ['breakeven', 'break.?even|נקודת איזון', 'Break-even Units', 'Finance', 'Q = \\frac{F}{p - v}', 'Q = F / (p - v)', 'Units to break even', 'units', 'F|Fixed costs|$|10000|0|1e9|100;p|Price per unit|$|50|0|1e7|0.5;v|Variable cost per unit|$|30|0|1e7|0.5', 'F / (p - v)'],
    ['profit_margin', 'profit margin|gross margin|שולי רווח|אחוז רווח', 'Profit Margin', 'Finance', 'm = \\frac{R - C}{R} \\times 100', 'margin = (R - C) / R * 100', 'Margin', '%', 'R|Revenue|$|1000|0.01|1e10|1;C|Cost|$|650|0|1e10|1', '(R - C) / R * 100'],
    ['pace', 'running pace|pace (per|calculator)|קצב ריצה', 'Running Pace', 'Health', 'pace = \\frac{t}{d}', 'pace = time / distance', 'Pace', 'min/km', 't|Time|min|50|0.1|10000|0.5;d|Distance|km|10|0.01|1000|0.1', 't / d'],
    ['calories_burn', 'calories burned|met calories|שריפת קלוריות', 'Calories Burned (MET)', 'Health', 'kcal = MET \\times m \\times t', 'kcal = MET * kg * hours', 'Energy burned', 'kcal', 'MET|Activity MET||8|1|20|0.1;m|Body weight|kg|70|20|250|0.5;t|Duration|h|1|0|24|0.05', 'MET * m * t'],
    ['heart_rate', 'max(imum)? heart rate|target heart rate|דופק מקסימלי', 'Target Heart Rate (Karvonen)', 'Health', 'THR = (HR_{max} - HR_{rest}) \\cdot I + HR_{rest}', 'THR = (220 - age - HRrest) * I + HRrest', 'Target heart rate', 'bpm', 'age|Age|years|30|5|110|1;HRrest|Resting heart rate|bpm|60|30|120|1;I|Intensity (0–1)||0.7|0|1|0.05', '(220 - age - HRrest) * I + HRrest'],
    ['water_intake', 'water intake|how much water|כמה מים', 'Daily Water Intake (estimate)', 'Health', 'W = 0.033 \\cdot m', 'W = 0.033 L/kg * weight', 'Water per day', 'L', 'm|Body weight|kg|70|20|250|0.5', '0.033 * m'],
    ['triangle_heron', "heron[’']?s formula|triangle area from (three |3 )?sides|נוסחת הרון", 'Heron’s Formula (triangle area)', 'Math', 'A = \\sqrt{s(s-a)(s-b)(s-c)}', 'A = sqrt(s(s-a)(s-b)(s-c)), s = (a+b+c)/2', 'Area', 'units²', 'a|Side a|units|3|0|1000|0.1;b|Side b|units|4|0|1000|0.1;c|Side c|units|5|0|1000|0.1', 'Math.sqrt(((a + b + c) / 2) * ((a + b + c) / 2 - a) * ((a + b + c) / 2 - b) * ((a + b + c) / 2 - c))'],
    ['law_cosines', 'law of cosines|cosine rule|משפט הקוסינוסים', 'Law of Cosines', 'Math', 'c = \\sqrt{a^2 + b^2 - 2ab\\cos\\gamma}', 'c = sqrt(a^2 + b^2 - 2ab*cos(γ))', 'Side c', 'units', 'a|Side a|units|5|0|1000|0.1;b|Side b|units|7|0|1000|0.1;gamma|Angle γ|°|60|0|180|0.5', 'Math.sqrt(a ** 2 + b ** 2 - 2 * a * b * Math.cos(gamma * Math.PI / 180))'],
    ['arith_seq', 'arithmetic (sequence|progression|series)|סדרה חשבונית', 'Arithmetic Series Sum', 'Math', 'S_n = \\frac{n}{2}(2a_1 + (n-1)d)', 'Sn = n/2 * (2*a1 + (n-1)*d)', 'Sum', '', 'a1|First term||1|-1e6|1e6|1;d|Common difference||1|-1e6|1e6|1;n|Number of terms||100|1|1e6|1', 'n / 2 * (2 * a1 + (n - 1) * d)'],
    ['geo_seq', 'geometric (sequence|progression|series)|סדרה הנדסית', 'Geometric Series Sum', 'Math', 'S_n = a_1 \\frac{1 - r^n}{1 - r}', 'Sn = a1 * (1 - r^n) / (1 - r)', 'Sum', '', 'a1|First term||1|-1e6|1e6|1;r|Ratio||2|-10|10|0.01;n|Number of terms||10|1|1000|1', 'a1 * (1 - r ** n) / (1 - r)'],
    ['std_normal', 'z.?score|standard score|ציון תקן', 'Z-score', 'Statistics', 'z = \\frac{x - \\mu}{\\sigma}', 'z = (x - μ) / σ', 'z-score', '', 'x|Value||85|-1e6|1e6|0.1;mu|Mean||70|-1e6|1e6|0.1;sigma|Standard deviation||10|0.0001|1e6|0.1', '(x - mu) / sigma'],
    ['sample_size', 'sample size|גודל מדגם', 'Sample Size (proportion)', 'Statistics', 'n = \\frac{z^2 p (1-p)}{e^2}', 'n = z^2 * p(1-p) / e^2', 'Sample size', '', 'z|z (1.96 = 95%)||1.96|0.5|4|0.01;p|Expected proportion||0.5|0.01|0.99|0.01;e|Margin of error||0.05|0.001|0.5|0.001', 'z ** 2 * p * (1 - p) / e ** 2'],
    ['cylinder_area', 'surface area of (a )?cylinder|cylinder surface|שטח פנים של גליל', 'Cylinder Surface Area', 'Math', 'A = 2\\pi r (r + h)', 'A = 2π * r * (r + h)', 'Surface area', 'units²', 'r|Radius|units|3|0|1000|0.1;h|Height|units|10|0|1000|0.1', '2 * Math.PI * r * (r + h)'],
    ['sphere_area', 'surface area of (a )?sphere|sphere surface|שטח פנים של כדור', 'Sphere Surface Area', 'Math', 'A = 4\\pi r^2', 'A = 4π * r^2', 'Surface area', 'units²', 'r|Radius|units|5|0|1000|0.1', '4 * Math.PI * r ** 2'],
    ['rect_area', 'area of (a )?rectangle|rectangle area|שטח מלבן', 'Rectangle Area & Perimeter', 'Math', 'A = w \\cdot h', 'A = w * h', 'Area', 'units²', 'w|Width|units|4|0|10000|0.1;h|Height|units|6|0|10000|0.1', 'w * h'],
    ['log_base', 'logarithm (base|of)|log base|לוגריתם', 'Logarithm (any base)', 'Math', 'y = \\log_b x', 'y = ln(x) / ln(b)', 'Logarithm', '', 'x|Value x||100|0.000001|1e12|1;b|Base||10|1.0001|1000|0.1', 'Math.log(x) / Math.log(b)'],
    ['data_transfer', 'download time|transfer time|זמן הורדה', 'Download / Transfer Time', 'General', 't = \\frac{8 S}{B}', 't = 8 * size(MB) / bandwidth(Mbps)', 'Time', 's', 'S|File size|MB|700|0|1e7|1;B|Bandwidth|Mbps|100|0.01|100000|1', '8 * S / B'],
    ['ev_range', 'ev range|electric (car|vehicle) range|טווח רכב חשמלי', 'EV Driving Range', 'General', 'R = \\frac{E}{c} \\times 100', 'range = battery kWh / (kWh/100km) * 100', 'Range', 'km', 'E|Battery capacity|kWh|60|1|300|1;c|Consumption|kWh/100km|16|5|50|0.1', 'E / c * 100'],
    ['solar', 'solar (panel )?(output|energy|production)|ייצור סולארי', 'Solar Panel Daily Energy', 'Engineering', 'E = P \\cdot H \\cdot \\eta', 'E = kWp * sun hours * efficiency', 'Energy per day', 'kWh', 'P|System size|kWp|5|0|10000|0.1;H|Peak sun hours|h|5.5|0|12|0.1;eta|System efficiency||0.8|0|1|0.01', 'P * H * eta'],
    ['beam_stress', 'bending stress|beam stress|מאמץ כפיפה', 'Bending Stress (rectangular beam)', 'Engineering', '\\sigma = \\frac{6 M}{b h^2}', 'σ = 6M / (b*h^2)', 'Bending stress', 'Pa', 'M|Bending moment|N·m|5000|0|1e8|10;b|Width|m|0.1|0.001|10|0.001;h|Height|m|0.2|0.001|10|0.001', '6 * M / (b * h ** 2)'],
    ['stress_strain', "young[’']?s modulus|stress (and|&) strain|מודול יאנג", 'Stress from Strain (Young’s modulus)', 'Engineering', '\\sigma = E \\varepsilon', 'σ = E * ε', 'Stress', 'Pa', 'E|Young’s modulus|Pa|200000000000|1e6|1e12|1e9;eps|Strain||0.001|0|0.5|0.0001', 'E * eps'],
    ['gear_ratio', 'gear ratio|יחס תמסורת', 'Gear Ratio & Output Speed', 'Engineering', '\\omega_{out} = \\omega_{in} \\frac{N_{in}}{N_{out}}', 'ωout = ωin * Nin / Nout', 'Output speed', 'rpm', 'win|Input speed|rpm|1500|0|100000|10;Nin|Driver teeth||20|1|1000|1;Nout|Driven teeth||60|1|1000|1', 'win * Nin / Nout'],
  ];
  const FILLER = /\b(the|a|an|of|for|to|me|my|please|build|make|create|give|show|calc|calculate|calculator|compute|formula|formulas|equation|law|live|interactive|with|and|in|on|find|what|is|how|do|i|can|you)\b|נוסח[אה]|מחשבון|תבנה|צור|לי|של|עבור|את|חשב/gi;
  const parseVars = (s) => s.split(';').map((x) => { const [symbol, label, unit, d, mn, mx, st] = x.split('|'); return { symbol, label, unit, defaultVal: +d, min: +mn, max: +mx, step: +st }; });
  const LIB = L.map(([id, kw, title, domain, latex, expressionText, resultLabel, unit, vars, js]) => ({ id, rx: new RegExp(kw, 'i'), spec: { title, domain, latex, expressionText, resultLabel, unit, variables: parseVars(vars), jsExpression: js, description: '', source: 'library' } }));

  function matchLibrary(prompt) {
    const p = String(prompt || '').trim();
    if (!p || p.length > 160) return null;
    for (const e of LIB) {
      const m = p.match(e.rx);
      if (!m) continue;
      const rest = p.replace(m[0], ' ').replace(FILLER, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
      const extra = rest ? rest.split(/\s+/).filter((w) => w.length > 1).length : 0;
      if (extra <= 3) return JSON.parse(JSON.stringify(e.spec));
    }
    return null;
  }

  /** Instant library search for the formula picker: ranked by title/keyword match. */
  function search(query, limit) {
    const q = String(query || '').toLowerCase().trim();
    const n = limit || 8;
    if (!q) return [];
    const words = q.split(/\s+/).filter((w) => w.length > 1);
    const scored = [];
    for (const e of LIB) {
      const title = e.spec.title.toLowerCase();
      const hay = title + ' ' + e.rx.source.toLowerCase().replace(/[\\()?|.*+[\]]/g, ' ') + ' ' + e.spec.domain.toLowerCase();
      let sc = 0;
      if (e.rx.test(query)) sc += 10;
      if (title.startsWith(q)) sc += 6; else if (title.includes(q)) sc += 4;
      for (const w of words) if (hay.includes(w)) sc += 1;
      if (sc > 0) scored.push({ sc, id: e.id, title: e.spec.title, domain: e.spec.domain });
    }
    return scored.sort((a, b) => b.sc - a.sc).slice(0, n);
  }
  function byId(id) { const e = LIB.find((x) => x.id === id); return e ? JSON.parse(JSON.stringify(e.spec)) : null; }

  const FNS = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'sqrt', 'cbrt', 'abs', 'log', 'ln', 'log10', 'log2', 'exp', 'pow', 'min', 'max', 'round', 'floor', 'ceil', 'hypot', 'sign']);
  const CONSTS = { pi: 'Math.PI', π: 'Math.PI', e: 'Math.E' };
  /** Parse a typed formula ("A = P(1 + r/n)^(nt)", "F = G*m1*m2/r^2") into a calculator spec, or null. */
  function parseTyped(prompt) {
    let s = String(prompt || '').trim().replace(/^(formula|calculator|calculate|compute)\s*:?\s*/i, '');
    s = s.replace(/[×⋅∙·]/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/²/g, '^2').replace(/³/g, '^3').replace(/√\s*\(/g, 'sqrt(').replace(/√\s*([A-Za-z0-9_.]+)/g, 'sqrt($1)');
    const m = s.match(/^\s*([A-Za-z][A-Za-z0-9_]*)\s*=\s*([^=]+)$/) || s.match(/^\s*()([^=]+)$/);
    if (!m) return null;
    const lhs = m[1];
    let rhs = m[2].trim();
    if (!/^[\sA-Za-z0-9_+\-*/^().,π]+$/.test(rhs)) return null;
    if (!/[+\-*/^(]/.test(rhs)) return null;
    rhs = rhs.replace(/π/g, ' pi ').replace(/\s+/g, ' ').trim()
      .replace(/([A-Za-z0-9_)])\s+(?=[A-Za-z(])/g, (all, c) => c + '*').replace(/\s+/g, '');
    // tokens
    const idents = rhs.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
    const singles = new Set(idents.filter((w) => w.length === 1 && !(w in CONSTS)));
    // words like the prose "what is" -> bail out
    const words = idents.filter((w) => !FNS.has(w.toLowerCase()) && !(w.toLowerCase() in CONSTS));
    if (words.some((w) => w.length > 3 && !/\d|_/.test(w) && !/^[A-Z]/.test(w) && !w.split('').every((c) => singles.has(c)))) return null;
    // split implicit products like "nt" into n*t when each letter is a variable elsewhere (or all are single letters)
    rhs = rhs.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (w) => {
      const lw = w.toLowerCase();
      if (FNS.has(lw) || lw in CONSTS || /\d|_/.test(w) || w.length === 1) return w;
      if (w.length <= 3 && w.split('').every((c) => singles.has(c) || /[a-z]/i.test(c))) return w.split('').join('*');
      return w;
    });
    let js = rhs
      .replace(/\^/g, '**')
      .replace(/(\d)\s*([A-Za-z(])/g, '$1*$2')
      .replace(/\)\s*([A-Za-z0-9(])/g, ')*$1')
      .replace(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g, (all, f) => (FNS.has(f.toLowerCase()) ? f + '(' : f + '*('))
      .replace(/\bln\(/g, 'log(')
      .replace(/\b(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|sqrt|cbrt|abs|log|log10|log2|exp|pow|min|max|round|floor|ceil|hypot|sign)\(/g, 'Math.$1(')
      .replace(/π|\bpi\b/gi, 'Math.PI')
      .replace(/\be\b/g, 'Math.E');
    const vars = [];
    const seen = new Set();
    for (const w of js.replace(/Math\.[A-Za-z0-9_]+/g, ' ').match(/[A-Za-z_][A-Za-z0-9_]*/g) || []) {
      if (!seen.has(w)) { seen.add(w); vars.push(w); }
    }
    if (!vars.length || vars.length > 12) return null;
    let fn;
    try { fn = new Function(...vars, '"use strict";return (' + js + ');'); const out = fn(...vars.map(() => 2)); if (typeof out !== 'number') return null; } catch (_) { return null; }
    const latex = (lhs ? lhs + ' = ' : '') + rhs.replace(/\*\*/g, '^').replace(/\*/g, ' \\cdot ').replace(/sqrt\(([^()]+)\)/g, '\\sqrt{$1}').replace(/\^\(([^()]+)\)/g, '^{$1}');
    return {
      title: lhs ? `${lhs} = ${m[2].trim()}` : 'Custom formula', domain: 'Formula', description: '', latex, expressionText: (lhs ? lhs + ' = ' : '') + m[2].trim(),
      resultLabel: lhs || 'Result', unit: '', jsExpression: js, source: 'parsed',
      variables: vars.map((v) => ({ symbol: v, label: v, unit: '', defaultVal: 2, min: 0, max: 100, step: 0.1 })),
    };
  }

  const CACHE_KEY = 'lz.formulaCache.v1';
  const norm = (p) => String(p || '').toLowerCase().replace(/\s+/g, ' ').trim();
  function cacheGet(prompt) {
    try { const c = JSON.parse(root.localStorage.getItem(CACHE_KEY) || '{}'); const h = c[norm(prompt)]; return h ? h.s : null; } catch (_) { return null; }
  }
  function cachePut(prompt, spec) {
    try {
      const c = JSON.parse(root.localStorage.getItem(CACHE_KEY) || '{}');
      c[norm(prompt)] = { s: spec, t: Date.now() };
      const keys = Object.keys(c);
      if (keys.length > 80) keys.sort((a, b) => c[a].t - c[b].t).slice(0, keys.length - 80).forEach((k) => delete c[k]);
      root.localStorage.setItem(CACHE_KEY, JSON.stringify(c));
    } catch (_) {}
  }
  /** Instant spec (library → typed formula → cache), or null when the AI is needed. */
  function instant(prompt) {
    return matchLibrary(prompt) || parseTyped(prompt) || cacheGet(prompt);
  }
  const api = { instant, matchLibrary, parseTyped, cacheGet, cachePut, search, byId, ids: LIB.map((e) => e.id), size: LIB.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FormulaFast = api;
})(typeof window !== 'undefined' ? window : globalThis);
