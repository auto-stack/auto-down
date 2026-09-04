// GENERATED FILE — do not edit by hand.
// Source: packages/engine/auto/render/artifact_hash.at (Auto language, plan
// 031 D5 — rendered-artifact cache key single source). Regenerate with:
// pnpm gen:render (auto/render/gen.mjs — `auto trans --path artifact_hash.at
// rust` + RP2 encode_utf16 wrapper append). Cross-target parity:
// tests/artifact_hash_parity.rs asserts the TS emission's golden
// projection (tests/golden/artifact-hash.golden.txt, rewritten by the
// engine's artifact-hash.test.ts on every `pnpm test`).

pub fn fnvOffsetBasis() -> i64 {
    return 2000000000 + 166136261;
}

pub fn fnvPrime() -> i64 {
    return 16777619;
}

pub fn u32Modulus() -> i64 {
    return 65536 * 65536;
}

pub fn bitAt(x: i64, p: i64) -> i64 {
    let r: i64 = x % p;
    let t: i64 = x - r;
    let q: i64 = t / p;
    return q % 2;
}

pub fn xor32(a: i64, b: i64) -> i64 {
    let mut r: i64 = 0;
    let mut p: i64 = 1;
    let mut i: i64 = 0;
    while i < 32 {
        let ab: i64 = bitAt(a, p);
        let bb: i64 = bitAt(b, p);
        if ab != bb {
            r = r + p;
        }
        p = p * 2;
        i = i + 1;
    }
    return r;
}

pub fn mulMod32(a: i64, b: i64) -> i64 {
    let lo: i64 = a % 65536;
    let t: i64 = a - lo;
    let hi: i64 = t / 65536;
    let ph: i64 = hi * b;
    let pl: i64 = lo * b;
    let phr: i64 = ph % u32Modulus();
    let plr: i64 = pl % u32Modulus();
    let s1: i64 = phr * 65536;
    let s: i64 = s1 + plr;
    return s % u32Modulus();
}

pub fn fnvStep(h: i64, u: i64) -> i64 {
    let x: i64 = xor32(h, u);
    return mulMod32(x, fnvPrime());
}

pub fn hexDigit(d: i64) -> String {
    let digits: String = "0123456789abcdef".to_string();
    return digits.chars().take((d + 1) as usize).skip((d) as usize).collect::<String>().to_string();
}

pub fn hex32(v: i64) -> String {
    let mut out: String = "".to_string();
    let mut x: i64 = v;
    let mut i: i64 = 0;
    while i < 8 {
        let d: i64 = x % 16;
        out = format!("{}{}", hexDigit(d), out);
        let t: i64 = x - d;
        x = t / 16;
        i = i + 1;
    }
    return out;
}

pub fn artifactKeyOf(kind: &str, source_len: i64, mut units: Vec<i64>) -> String {
    let mut h: i64 = fnvOffsetBasis();
    for i in 0..(units.len() as i64) {
        h = fnvStep(h, units[(i) as usize].clone());
    }
    return format!("{}{}", format!("{}{}", format!("{}{}", format!("{}{}", kind, ":"), format!("{:?}", source_len)), ":"), hex32(h));
}


// RP2 (plan 031): hand-written platform wrapper — the UTF-16 unit
// materialization the .at source cannot express (encode_utf16 matches the
// TS side's charCodeAt loop by construction; UTF-16 is the common
// denominator both targets encode identically).
pub fn artifact_hash(kind: &str, source: &str) -> String {
    let mut units: Vec<i64> = kind.encode_utf16().map(i64::from).collect();
    units.push(0);
    units.extend(source.encode_utf16().map(i64::from));
    let source_len = source.encode_utf16().count() as i64;
    artifactKeyOf(kind, source_len, units)
}
