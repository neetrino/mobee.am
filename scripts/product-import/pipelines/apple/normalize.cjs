"use strict";

function cleanText(v) {
  return String(v || "")
    .replace(/\u200b/g, "")
    .replace(/\xa0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(v) {
  return cleanText(v)
    .toLowerCase()
    .replace(/[''‑–—]/g, " ")
    .replace(/[^\w\s./+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function productFamily(name) {
  const n = normalize(name);
  if (/iphone/.test(n)) return "iphone";
  if (/ipad/.test(n)) return "ipad";
  if (/macbook|imac|mac mini|mac studio|mac neo/.test(n)) return "mac";
  if (/watch/.test(n)) return "watch";
  if (/airpods|airpod/.test(n)) return "airpods";
  if (/vision/.test(n)) return "vision";
  if (/homepod|homepad|apple tv|doorbell|security camera/.test(n)) return "home";
  if (/magsafe|magic keyboard|airtag|studio display/.test(n)) return "accessory";
  return "other";
}

function extractChipTokens(n) {
  const tokens = new Set();
  const m = n.match(/\bm([1-9]\d?)\b/g);
  if (m) m.forEach((x) => tokens.add(x));
  const proMax = n.match(/\bm(\d+)\s*(pro\s*max|max)/);
  if (proMax) {
    tokens.add(`m${proMax[1]} max`);
    tokens.add("max");
  } else if (/\bpro max\b/.test(n)) tokens.add("max");
  if (/\bpro\b/.test(n) && !/\bpro max\b/.test(n)) tokens.add("pro");
  const a = n.match(/\ba(\d{2})\b/g);
  if (a) a.forEach((x) => tokens.add(x));
  return tokens;
}

function parentModelKey(name) {
  const n = normalize(name);
  if (/iphone/.test(n)) {
    if (/16e/.test(n)) return "iPhone 16e";
    if (/17 pro max/.test(n)) return "iPhone 17 Pro Max";
    if (/17 pro/.test(n)) return "iPhone 17 Pro";
    if (/17e/.test(n)) return "iPhone 17e";
    if (/iphone air/.test(n)) return "iPhone Air";
    if (/iphone 17/.test(n)) return "iPhone 17";
    if (/iphone 16/.test(n)) return "iPhone 16";
  }
  if (/macbook air/.test(n)) {
    const size = n.match(/\b(13|15)(?:\.\d)?\b/)?.[1] || "";
    const chip = n.match(/\bm([345])\b/)?.[0] || "";
    return `MacBook Air ${size ? `${size}-inch ` : ""}${chip.toUpperCase()}`.trim();
  }
  if (/macbook pro/.test(n)) {
    const size = n.match(/\b(14|16)(?:\.\d)?\b/)?.[1] || "";
    let chip = "M5";
    if (/m5 max|m5\s*max/.test(n)) chip = "M5 Max";
    else if (/m5 pro|m5\s*pro/.test(n)) chip = "M5 Pro";
    else if (/m5\b/.test(n)) chip = "M5";
    return `MacBook Pro ${size ? `${size}-inch ` : ""}${chip}`.trim();
  }
  if (/mac mini/.test(n)) return /m5/.test(n) ? "Mac mini M5" : "Mac mini";
  if (/mac studio/.test(n)) {
    if (/2025/.test(n)) return "Mac Studio 2025";
    return /m5/.test(n) ? "Mac Studio M5" : "Mac Studio";
  }
  if (/\bimac\b/.test(n)) return "iMac";
  if (/ipad pro 11/.test(n)) return "iPad Pro 11 M5";
  if (/ipad pro 13/.test(n)) return "iPad Pro 13 M5";
  if (/ipad air 11/.test(n)) return /m4/.test(n) ? "iPad Air 11 M4" : "iPad Air 11 M3";
  if (/ipad air 13/.test(n)) return /m4/.test(n) ? "iPad Air 13 M4" : "iPad Air 13 M3";
  if (/ipad mini/.test(n)) return /oled/.test(n) ? "iPad mini OLED" : "iPad mini";
  if (/11th|a16/.test(n) && /ipad/.test(n)) return "iPad 11th Gen A16";
  if (/ipad a18|a18.*ipad/.test(n)) return "iPad A18";
  if (/series 12|s12/.test(n)) return "Apple Watch Series 12";
  if (/ultra 4/.test(n)) return "Apple Watch Ultra 4";
  if (/airpods max 2|airpods max.*2|max 2/.test(n)) return "AirPods Max 2";
  if (/airpods ultra/.test(n)) return "AirPods Ultra";
  if (/vision pro/.test(n)) return /m5/.test(n) ? "Apple Vision Pro M5" : "Apple Vision Pro";
  if (/apple tv/.test(n)) return "Apple TV 4K A17 Pro";
  if (/homepod mini 2/.test(n)) return "HomePod mini 2";
  if (/homepod 3/.test(n)) return "HomePod 3";
  if (/homepad/.test(n)) return "HomePad";
  if (/security camera/.test(n)) return "Apple Security Camera";
  if (/doorbell/.test(n)) return "Apple Video Doorbell";
  if (/magic keyboard.*ipad air/.test(n)) return "Magic Keyboard for iPad Air";
  if (/magsafe battery/.test(n)) return "MagSafe Battery";
  if (/magsafe charger.*25|qi2/.test(n)) return "MagSafe Charger 25W Qi2";
  if (/airtag 2/.test(n)) return "AirTag 2";
  if (/studio display xdr/.test(n)) return "Studio Display XDR";
  if (/studio display/.test(n)) return "Studio Display 2026";
  return cleanText(name);
}

function isThirdPartyAccessory(name) {
  const n = normalize(name);
  const block = [
    "case", "cover", "glass for", "screen protector", "tempered", "levelo", "porodo",
    "guess", "folio", "strap", "band only", "cable", "adapter only", "bumper",
  ];
  if (block.some((b) => n.includes(b))) return true;
  if (/iphone 16e/.test(n) && /silicone case|case/.test(n)) return true;
  return false;
}

function extractSeriesNumber(text) {
  const n = normalize(text);
  const m = n.match(/series\s*(\d{1,2})/);
  return m ? m[1] : null;
}

function extractUltraNumber(text) {
  const n = normalize(text);
  const m = n.match(/ultra\s*(\d)?/);
  return m?.[1] || (/\bultra\b/.test(n) ? "1" : null);
}

function strictGenerationMatch(targetModel, candidateName, sourceUrl = "") {
  const blob = normalize(`${candidateName} ${sourceUrl}`);

  if (/series\s*\d+/i.test(targetModel)) {
    const want = extractSeriesNumber(targetModel);
    const got = extractSeriesNumber(candidateName);
    if (!got || want !== got) return false;
  }
  if (/ultra\s*\d+/i.test(targetModel)) {
    const want = extractUltraNumber(targetModel);
    const got = extractUltraNumber(candidateName);
    if (!got || want !== got) return false;
  }
  if (/airpods max 2/i.test(targetModel)) {
    if (!/max-2|max 2|max2/.test(blob)) return false;
    if (/max-2|max 2|max2/.test(blob) === false) return false;
  }
  if (/mac mini m5/i.test(targetModel)) {
    if (!/mac mini/.test(blob) || !/\bm5\b/.test(blob)) return false;
    if (/macbook/.test(blob)) return false;
  }
  if (/mac studio/i.test(targetModel)) {
    if (!/mac studio/.test(blob)) return false;
  }
  if (/macbook pro.*max/i.test(targetModel)) {
    if (!/macbook pro/.test(blob) || !/\bmax\b/.test(blob)) return false;
  }
  if (/macbook air 15.*m4/i.test(targetModel)) {
    if (!/macbook air/.test(blob) || !/\b15/.test(blob) || !/\bm4\b/.test(blob)) return false;
  }
  if (/ipad air 11 m3/i.test(targetModel)) {
    if (!/ipad air/.test(blob) || !/\b11\b/.test(blob) || !/\bm3\b/.test(blob) || /\bm4\b/.test(blob)) return false;
  }
  if (/ipad air 13 m3/i.test(targetModel)) {
    if (!/ipad air/.test(blob) || !/\b13\b/.test(blob) || !/\bm3\b/.test(blob) || /\bm4\b/.test(blob)) return false;
  }
  if (/ipad air 11 m4/i.test(targetModel)) {
    if (!/ipad air/.test(blob) || !/\b11\b/.test(blob) || !/\bm4\b/.test(blob)) return false;
  }
  if (/ipad air 13 m4/i.test(targetModel)) {
    if (!/ipad air/.test(blob) || !/\b13\b/.test(blob) || !/\bm4\b/.test(blob)) return false;
  }
  if (/ipad pro 11 m5/i.test(targetModel)) {
    if (!/ipad pro/.test(blob) || !/\b11\b/.test(blob) || !/\bm5\b/.test(blob)) return false;
  }
  if (/ipad pro 13 m5/i.test(targetModel)) {
    if (!/ipad pro/.test(blob) || !/\b13\b/.test(blob) || !/\bm5\b/.test(blob)) return false;
  }
  if (/iphone 16e/i.test(targetModel)) {
    if (!/iphone/.test(blob) || !/16e/.test(blob.replace(/\s/g, ""))) return false;
  }
  if (/ipad 11th gen a16|ipad a16/i.test(targetModel)) {
    if (!/\ba16\b/.test(blob) && !/11th/.test(blob)) return false;
  }
  if (/ipad a18/i.test(targetModel)) {
    if (!/\ba18\b/.test(blob)) return false;
  }
  if (/magsafe charger 25w/i.test(targetModel)) {
    if (!/magsafe charger/.test(blob) || !/25w|25 w|qi2/.test(blob)) return false;
  }
  if (/magic keyboard.*ipad air/i.test(targetModel)) {
    if (!/magic keyboard/.test(blob) || !/ipad air/.test(blob)) return false;
  }
  if (/airtag 2/i.test(targetModel)) {
    if (!/airtag/.test(blob) || !/\b2\b|2nd|second/.test(blob)) return false;
  }
  if (/studio display xdr/i.test(targetModel)) {
    if (!/studio display/.test(blob) || !/xdr/.test(blob)) return false;
  }
  if (/vision pro m5/i.test(targetModel)) {
    if (!/vision pro/.test(blob) || !/\bm5\b/.test(blob)) return false;
  }
  return true;
}

function matchesTarget(targetModel, candidateName, sourceUrl = "") {
  const targetKey = parentModelKey(targetModel);
  const candidateKey = parentModelKey(candidateName);
  const tn = normalize(targetModel);
  const cn = normalize(candidateName);

  if (productFamily(targetModel) !== productFamily(candidateName)) {
    return { ok: false, reason: "different_product_family" };
  }
  if (isThirdPartyAccessory(candidateName)) return { ok: false, reason: "third_party_accessory" };
  if (/ipad mini oled/i.test(targetModel) && /ipad mini/.test(cn) && !/oled/.test(cn)) {
    return { ok: false, reason: "oled_not_confirmed_in_source_title" };
  }
  if (!strictGenerationMatch(targetModel, candidateName, sourceUrl)) {
    return { ok: false, reason: "generation_or_line_mismatch" };
  }

  if (targetKey && candidateKey && normalize(targetKey) === normalize(candidateKey)) {
    return { ok: true, reason: "parent_model_key" };
  }

  const chipT = extractChipTokens(tn);
  const chipC = extractChipTokens(cn);
  for (const c of chipT) {
    if (!chipC.has(c) && !cn.includes(c.replace(" ", ""))) {
      if (c.includes("max") || c === "pro" || c.startsWith("m") || c.startsWith("a")) {
        return { ok: false, reason: `chip_mismatch:${c}` };
      }
    }
  }

  const sizeT = tn.match(/\b(11|13|14|15|16)\b/)?.[1];
  const sizeC = cn.match(/\b(11|13|14|15|16)\b/)?.[1];
  if (sizeT && sizeC && sizeT !== sizeC) return { ok: false, reason: "size_mismatch" };

  const targetTokens = tn.split(/\s+/).filter((t) => t.length > 1 && !["apple", "inch"].includes(t));
  let overlap = 0;
  for (const tok of targetTokens) if (cn.includes(tok)) overlap += 1;
  const need = Math.max(3, Math.ceil(targetTokens.length * 0.75));
  if (overlap >= need) return { ok: true, reason: `token_overlap_${overlap}` };

  return { ok: false, reason: "weak_match" };
}

function variantDedupeKey(v) {
  const opts = v.options || {};
  return [
    parentModelKey(v.normalized_model || v.model || v.name),
    opts.color || "",
    opts.storage || opts.memory || "",
    opts.connectivity || "",
    opts.size || "",
    opts.chip || opts.processor || "",
    opts.glass || "",
    v.source || "",
    v.source_pid || v.sku || v.source_url || "",
  ]
    .map((x) => normalize(x))
    .join("|");
}

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

module.exports = {
  cleanText,
  normalize,
  productFamily,
  parentModelKey,
  isThirdPartyAccessory,
  matchesTarget,
  variantDedupeKey,
  slugify,
};
