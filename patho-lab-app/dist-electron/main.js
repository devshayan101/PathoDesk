import { app, BrowserWindow, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path$1 from "node:path";
import Database from "better-sqlite3";
import * as path from "path";
import nodeCrypto from "crypto";
var randomFallback = null;
function randomBytes(len) {
  try {
    return crypto.getRandomValues(new Uint8Array(len));
  } catch {
  }
  try {
    return nodeCrypto.randomBytes(len);
  } catch {
  }
  if (!randomFallback) {
    throw Error(
      "Neither WebCryptoAPI nor a crypto module is available. Use bcrypt.setRandomFallback to set an alternative"
    );
  }
  return randomFallback(len);
}
function setRandomFallback(random) {
  randomFallback = random;
}
function genSaltSync(rounds, seed_length) {
  rounds = rounds || GENSALT_DEFAULT_LOG2_ROUNDS;
  if (typeof rounds !== "number")
    throw Error(
      "Illegal arguments: " + typeof rounds + ", " + typeof seed_length
    );
  if (rounds < 4) rounds = 4;
  else if (rounds > 31) rounds = 31;
  var salt = [];
  salt.push("$2b$");
  if (rounds < 10) salt.push("0");
  salt.push(rounds.toString());
  salt.push("$");
  salt.push(base64_encode(randomBytes(BCRYPT_SALT_LEN), BCRYPT_SALT_LEN));
  return salt.join("");
}
function genSalt(rounds, seed_length, callback) {
  if (typeof seed_length === "function")
    callback = seed_length, seed_length = void 0;
  if (typeof rounds === "function") callback = rounds, rounds = void 0;
  if (typeof rounds === "undefined") rounds = GENSALT_DEFAULT_LOG2_ROUNDS;
  else if (typeof rounds !== "number")
    throw Error("illegal arguments: " + typeof rounds);
  function _async(callback2) {
    nextTick(function() {
      try {
        callback2(null, genSaltSync(rounds));
      } catch (err) {
        callback2(err);
      }
    });
  }
  if (callback) {
    if (typeof callback !== "function")
      throw Error("Illegal callback: " + typeof callback);
    _async(callback);
  } else
    return new Promise(function(resolve, reject) {
      _async(function(err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
}
function hashSync(password, salt) {
  if (typeof salt === "undefined") salt = GENSALT_DEFAULT_LOG2_ROUNDS;
  if (typeof salt === "number") salt = genSaltSync(salt);
  if (typeof password !== "string" || typeof salt !== "string")
    throw Error("Illegal arguments: " + typeof password + ", " + typeof salt);
  return _hash(password, salt);
}
function hash(password, salt, callback, progressCallback) {
  function _async(callback2) {
    if (typeof password === "string" && typeof salt === "number")
      genSalt(salt, function(err, salt2) {
        _hash(password, salt2, callback2, progressCallback);
      });
    else if (typeof password === "string" && typeof salt === "string")
      _hash(password, salt, callback2, progressCallback);
    else
      nextTick(
        callback2.bind(
          this,
          Error("Illegal arguments: " + typeof password + ", " + typeof salt)
        )
      );
  }
  if (callback) {
    if (typeof callback !== "function")
      throw Error("Illegal callback: " + typeof callback);
    _async(callback);
  } else
    return new Promise(function(resolve, reject) {
      _async(function(err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
}
function safeStringCompare(known, unknown) {
  var diff = known.length ^ unknown.length;
  for (var i = 0; i < known.length; ++i) {
    diff |= known.charCodeAt(i) ^ unknown.charCodeAt(i);
  }
  return diff === 0;
}
function compareSync(password, hash2) {
  if (typeof password !== "string" || typeof hash2 !== "string")
    throw Error("Illegal arguments: " + typeof password + ", " + typeof hash2);
  if (hash2.length !== 60) return false;
  return safeStringCompare(
    hashSync(password, hash2.substring(0, hash2.length - 31)),
    hash2
  );
}
function compare(password, hashValue, callback, progressCallback) {
  function _async(callback2) {
    if (typeof password !== "string" || typeof hashValue !== "string") {
      nextTick(
        callback2.bind(
          this,
          Error(
            "Illegal arguments: " + typeof password + ", " + typeof hashValue
          )
        )
      );
      return;
    }
    if (hashValue.length !== 60) {
      nextTick(callback2.bind(this, null, false));
      return;
    }
    hash(
      password,
      hashValue.substring(0, 29),
      function(err, comp) {
        if (err) callback2(err);
        else callback2(null, safeStringCompare(comp, hashValue));
      },
      progressCallback
    );
  }
  if (callback) {
    if (typeof callback !== "function")
      throw Error("Illegal callback: " + typeof callback);
    _async(callback);
  } else
    return new Promise(function(resolve, reject) {
      _async(function(err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
}
function getRounds(hash2) {
  if (typeof hash2 !== "string")
    throw Error("Illegal arguments: " + typeof hash2);
  return parseInt(hash2.split("$")[2], 10);
}
function getSalt(hash2) {
  if (typeof hash2 !== "string")
    throw Error("Illegal arguments: " + typeof hash2);
  if (hash2.length !== 60)
    throw Error("Illegal hash length: " + hash2.length + " != 60");
  return hash2.substring(0, 29);
}
function truncates(password) {
  if (typeof password !== "string")
    throw Error("Illegal arguments: " + typeof password);
  return utf8Length(password) > 72;
}
var nextTick = typeof setImmediate === "function" ? setImmediate : typeof scheduler === "object" && typeof scheduler.postTask === "function" ? scheduler.postTask.bind(scheduler) : setTimeout;
function utf8Length(string) {
  var len = 0, c = 0;
  for (var i = 0; i < string.length; ++i) {
    c = string.charCodeAt(i);
    if (c < 128) len += 1;
    else if (c < 2048) len += 2;
    else if ((c & 64512) === 55296 && (string.charCodeAt(i + 1) & 64512) === 56320) {
      ++i;
      len += 4;
    } else len += 3;
  }
  return len;
}
function utf8Array(string) {
  var offset = 0, c1, c2;
  var buffer = new Array(utf8Length(string));
  for (var i = 0, k = string.length; i < k; ++i) {
    c1 = string.charCodeAt(i);
    if (c1 < 128) {
      buffer[offset++] = c1;
    } else if (c1 < 2048) {
      buffer[offset++] = c1 >> 6 | 192;
      buffer[offset++] = c1 & 63 | 128;
    } else if ((c1 & 64512) === 55296 && ((c2 = string.charCodeAt(i + 1)) & 64512) === 56320) {
      c1 = 65536 + ((c1 & 1023) << 10) + (c2 & 1023);
      ++i;
      buffer[offset++] = c1 >> 18 | 240;
      buffer[offset++] = c1 >> 12 & 63 | 128;
      buffer[offset++] = c1 >> 6 & 63 | 128;
      buffer[offset++] = c1 & 63 | 128;
    } else {
      buffer[offset++] = c1 >> 12 | 224;
      buffer[offset++] = c1 >> 6 & 63 | 128;
      buffer[offset++] = c1 & 63 | 128;
    }
  }
  return buffer;
}
var BASE64_CODE = "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
var BASE64_INDEX = [
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  0,
  1,
  54,
  55,
  56,
  57,
  58,
  59,
  60,
  61,
  62,
  63,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
  27,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  28,
  29,
  30,
  31,
  32,
  33,
  34,
  35,
  36,
  37,
  38,
  39,
  40,
  41,
  42,
  43,
  44,
  45,
  46,
  47,
  48,
  49,
  50,
  51,
  52,
  53,
  -1,
  -1,
  -1,
  -1,
  -1
];
function base64_encode(b, len) {
  var off = 0, rs = [], c1, c2;
  if (len <= 0 || len > b.length) throw Error("Illegal len: " + len);
  while (off < len) {
    c1 = b[off++] & 255;
    rs.push(BASE64_CODE[c1 >> 2 & 63]);
    c1 = (c1 & 3) << 4;
    if (off >= len) {
      rs.push(BASE64_CODE[c1 & 63]);
      break;
    }
    c2 = b[off++] & 255;
    c1 |= c2 >> 4 & 15;
    rs.push(BASE64_CODE[c1 & 63]);
    c1 = (c2 & 15) << 2;
    if (off >= len) {
      rs.push(BASE64_CODE[c1 & 63]);
      break;
    }
    c2 = b[off++] & 255;
    c1 |= c2 >> 6 & 3;
    rs.push(BASE64_CODE[c1 & 63]);
    rs.push(BASE64_CODE[c2 & 63]);
  }
  return rs.join("");
}
function base64_decode(s, len) {
  var off = 0, slen = s.length, olen = 0, rs = [], c1, c2, c3, c4, o, code;
  if (len <= 0) throw Error("Illegal len: " + len);
  while (off < slen - 1 && olen < len) {
    code = s.charCodeAt(off++);
    c1 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    code = s.charCodeAt(off++);
    c2 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    if (c1 == -1 || c2 == -1) break;
    o = c1 << 2 >>> 0;
    o |= (c2 & 48) >> 4;
    rs.push(String.fromCharCode(o));
    if (++olen >= len || off >= slen) break;
    code = s.charCodeAt(off++);
    c3 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    if (c3 == -1) break;
    o = (c2 & 15) << 4 >>> 0;
    o |= (c3 & 60) >> 2;
    rs.push(String.fromCharCode(o));
    if (++olen >= len || off >= slen) break;
    code = s.charCodeAt(off++);
    c4 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
    o = (c3 & 3) << 6 >>> 0;
    o |= c4;
    rs.push(String.fromCharCode(o));
    ++olen;
  }
  var res = [];
  for (off = 0; off < olen; off++) res.push(rs[off].charCodeAt(0));
  return res;
}
var BCRYPT_SALT_LEN = 16;
var GENSALT_DEFAULT_LOG2_ROUNDS = 10;
var BLOWFISH_NUM_ROUNDS = 16;
var MAX_EXECUTION_TIME = 100;
var P_ORIG = [
  608135816,
  2242054355,
  320440878,
  57701188,
  2752067618,
  698298832,
  137296536,
  3964562569,
  1160258022,
  953160567,
  3193202383,
  887688300,
  3232508343,
  3380367581,
  1065670069,
  3041331479,
  2450970073,
  2306472731
];
var S_ORIG = [
  3509652390,
  2564797868,
  805139163,
  3491422135,
  3101798381,
  1780907670,
  3128725573,
  4046225305,
  614570311,
  3012652279,
  134345442,
  2240740374,
  1667834072,
  1901547113,
  2757295779,
  4103290238,
  227898511,
  1921955416,
  1904987480,
  2182433518,
  2069144605,
  3260701109,
  2620446009,
  720527379,
  3318853667,
  677414384,
  3393288472,
  3101374703,
  2390351024,
  1614419982,
  1822297739,
  2954791486,
  3608508353,
  3174124327,
  2024746970,
  1432378464,
  3864339955,
  2857741204,
  1464375394,
  1676153920,
  1439316330,
  715854006,
  3033291828,
  289532110,
  2706671279,
  2087905683,
  3018724369,
  1668267050,
  732546397,
  1947742710,
  3462151702,
  2609353502,
  2950085171,
  1814351708,
  2050118529,
  680887927,
  999245976,
  1800124847,
  3300911131,
  1713906067,
  1641548236,
  4213287313,
  1216130144,
  1575780402,
  4018429277,
  3917837745,
  3693486850,
  3949271944,
  596196993,
  3549867205,
  258830323,
  2213823033,
  772490370,
  2760122372,
  1774776394,
  2652871518,
  566650946,
  4142492826,
  1728879713,
  2882767088,
  1783734482,
  3629395816,
  2517608232,
  2874225571,
  1861159788,
  326777828,
  3124490320,
  2130389656,
  2716951837,
  967770486,
  1724537150,
  2185432712,
  2364442137,
  1164943284,
  2105845187,
  998989502,
  3765401048,
  2244026483,
  1075463327,
  1455516326,
  1322494562,
  910128902,
  469688178,
  1117454909,
  936433444,
  3490320968,
  3675253459,
  1240580251,
  122909385,
  2157517691,
  634681816,
  4142456567,
  3825094682,
  3061402683,
  2540495037,
  79693498,
  3249098678,
  1084186820,
  1583128258,
  426386531,
  1761308591,
  1047286709,
  322548459,
  995290223,
  1845252383,
  2603652396,
  3431023940,
  2942221577,
  3202600964,
  3727903485,
  1712269319,
  422464435,
  3234572375,
  1170764815,
  3523960633,
  3117677531,
  1434042557,
  442511882,
  3600875718,
  1076654713,
  1738483198,
  4213154764,
  2393238008,
  3677496056,
  1014306527,
  4251020053,
  793779912,
  2902807211,
  842905082,
  4246964064,
  1395751752,
  1040244610,
  2656851899,
  3396308128,
  445077038,
  3742853595,
  3577915638,
  679411651,
  2892444358,
  2354009459,
  1767581616,
  3150600392,
  3791627101,
  3102740896,
  284835224,
  4246832056,
  1258075500,
  768725851,
  2589189241,
  3069724005,
  3532540348,
  1274779536,
  3789419226,
  2764799539,
  1660621633,
  3471099624,
  4011903706,
  913787905,
  3497959166,
  737222580,
  2514213453,
  2928710040,
  3937242737,
  1804850592,
  3499020752,
  2949064160,
  2386320175,
  2390070455,
  2415321851,
  4061277028,
  2290661394,
  2416832540,
  1336762016,
  1754252060,
  3520065937,
  3014181293,
  791618072,
  3188594551,
  3933548030,
  2332172193,
  3852520463,
  3043980520,
  413987798,
  3465142937,
  3030929376,
  4245938359,
  2093235073,
  3534596313,
  375366246,
  2157278981,
  2479649556,
  555357303,
  3870105701,
  2008414854,
  3344188149,
  4221384143,
  3956125452,
  2067696032,
  3594591187,
  2921233993,
  2428461,
  544322398,
  577241275,
  1471733935,
  610547355,
  4027169054,
  1432588573,
  1507829418,
  2025931657,
  3646575487,
  545086370,
  48609733,
  2200306550,
  1653985193,
  298326376,
  1316178497,
  3007786442,
  2064951626,
  458293330,
  2589141269,
  3591329599,
  3164325604,
  727753846,
  2179363840,
  146436021,
  1461446943,
  4069977195,
  705550613,
  3059967265,
  3887724982,
  4281599278,
  3313849956,
  1404054877,
  2845806497,
  146425753,
  1854211946,
  1266315497,
  3048417604,
  3681880366,
  3289982499,
  290971e4,
  1235738493,
  2632868024,
  2414719590,
  3970600049,
  1771706367,
  1449415276,
  3266420449,
  422970021,
  1963543593,
  2690192192,
  3826793022,
  1062508698,
  1531092325,
  1804592342,
  2583117782,
  2714934279,
  4024971509,
  1294809318,
  4028980673,
  1289560198,
  2221992742,
  1669523910,
  35572830,
  157838143,
  1052438473,
  1016535060,
  1802137761,
  1753167236,
  1386275462,
  3080475397,
  2857371447,
  1040679964,
  2145300060,
  2390574316,
  1461121720,
  2956646967,
  4031777805,
  4028374788,
  33600511,
  2920084762,
  1018524850,
  629373528,
  3691585981,
  3515945977,
  2091462646,
  2486323059,
  586499841,
  988145025,
  935516892,
  3367335476,
  2599673255,
  2839830854,
  265290510,
  3972581182,
  2759138881,
  3795373465,
  1005194799,
  847297441,
  406762289,
  1314163512,
  1332590856,
  1866599683,
  4127851711,
  750260880,
  613907577,
  1450815602,
  3165620655,
  3734664991,
  3650291728,
  3012275730,
  3704569646,
  1427272223,
  778793252,
  1343938022,
  2676280711,
  2052605720,
  1946737175,
  3164576444,
  3914038668,
  3967478842,
  3682934266,
  1661551462,
  3294938066,
  4011595847,
  840292616,
  3712170807,
  616741398,
  312560963,
  711312465,
  1351876610,
  322626781,
  1910503582,
  271666773,
  2175563734,
  1594956187,
  70604529,
  3617834859,
  1007753275,
  1495573769,
  4069517037,
  2549218298,
  2663038764,
  504708206,
  2263041392,
  3941167025,
  2249088522,
  1514023603,
  1998579484,
  1312622330,
  694541497,
  2582060303,
  2151582166,
  1382467621,
  776784248,
  2618340202,
  3323268794,
  2497899128,
  2784771155,
  503983604,
  4076293799,
  907881277,
  423175695,
  432175456,
  1378068232,
  4145222326,
  3954048622,
  3938656102,
  3820766613,
  2793130115,
  2977904593,
  26017576,
  3274890735,
  3194772133,
  1700274565,
  1756076034,
  4006520079,
  3677328699,
  720338349,
  1533947780,
  354530856,
  688349552,
  3973924725,
  1637815568,
  332179504,
  3949051286,
  53804574,
  2852348879,
  3044236432,
  1282449977,
  3583942155,
  3416972820,
  4006381244,
  1617046695,
  2628476075,
  3002303598,
  1686838959,
  431878346,
  2686675385,
  1700445008,
  1080580658,
  1009431731,
  832498133,
  3223435511,
  2605976345,
  2271191193,
  2516031870,
  1648197032,
  4164389018,
  2548247927,
  300782431,
  375919233,
  238389289,
  3353747414,
  2531188641,
  2019080857,
  1475708069,
  455242339,
  2609103871,
  448939670,
  3451063019,
  1395535956,
  2413381860,
  1841049896,
  1491858159,
  885456874,
  4264095073,
  4001119347,
  1565136089,
  3898914787,
  1108368660,
  540939232,
  1173283510,
  2745871338,
  3681308437,
  4207628240,
  3343053890,
  4016749493,
  1699691293,
  1103962373,
  3625875870,
  2256883143,
  3830138730,
  1031889488,
  3479347698,
  1535977030,
  4236805024,
  3251091107,
  2132092099,
  1774941330,
  1199868427,
  1452454533,
  157007616,
  2904115357,
  342012276,
  595725824,
  1480756522,
  206960106,
  497939518,
  591360097,
  863170706,
  2375253569,
  3596610801,
  1814182875,
  2094937945,
  3421402208,
  1082520231,
  3463918190,
  2785509508,
  435703966,
  3908032597,
  1641649973,
  2842273706,
  3305899714,
  1510255612,
  2148256476,
  2655287854,
  3276092548,
  4258621189,
  236887753,
  3681803219,
  274041037,
  1734335097,
  3815195456,
  3317970021,
  1899903192,
  1026095262,
  4050517792,
  356393447,
  2410691914,
  3873677099,
  3682840055,
  3913112168,
  2491498743,
  4132185628,
  2489919796,
  1091903735,
  1979897079,
  3170134830,
  3567386728,
  3557303409,
  857797738,
  1136121015,
  1342202287,
  507115054,
  2535736646,
  337727348,
  3213592640,
  1301675037,
  2528481711,
  1895095763,
  1721773893,
  3216771564,
  62756741,
  2142006736,
  835421444,
  2531993523,
  1442658625,
  3659876326,
  2882144922,
  676362277,
  1392781812,
  170690266,
  3921047035,
  1759253602,
  3611846912,
  1745797284,
  664899054,
  1329594018,
  3901205900,
  3045908486,
  2062866102,
  2865634940,
  3543621612,
  3464012697,
  1080764994,
  553557557,
  3656615353,
  3996768171,
  991055499,
  499776247,
  1265440854,
  648242737,
  3940784050,
  980351604,
  3713745714,
  1749149687,
  3396870395,
  4211799374,
  3640570775,
  1161844396,
  3125318951,
  1431517754,
  545492359,
  4268468663,
  3499529547,
  1437099964,
  2702547544,
  3433638243,
  2581715763,
  2787789398,
  1060185593,
  1593081372,
  2418618748,
  4260947970,
  69676912,
  2159744348,
  86519011,
  2512459080,
  3838209314,
  1220612927,
  3339683548,
  133810670,
  1090789135,
  1078426020,
  1569222167,
  845107691,
  3583754449,
  4072456591,
  1091646820,
  628848692,
  1613405280,
  3757631651,
  526609435,
  236106946,
  48312990,
  2942717905,
  3402727701,
  1797494240,
  859738849,
  992217954,
  4005476642,
  2243076622,
  3870952857,
  3732016268,
  765654824,
  3490871365,
  2511836413,
  1685915746,
  3888969200,
  1414112111,
  2273134842,
  3281911079,
  4080962846,
  172450625,
  2569994100,
  980381355,
  4109958455,
  2819808352,
  2716589560,
  2568741196,
  3681446669,
  3329971472,
  1835478071,
  660984891,
  3704678404,
  4045999559,
  3422617507,
  3040415634,
  1762651403,
  1719377915,
  3470491036,
  2693910283,
  3642056355,
  3138596744,
  1364962596,
  2073328063,
  1983633131,
  926494387,
  3423689081,
  2150032023,
  4096667949,
  1749200295,
  3328846651,
  309677260,
  2016342300,
  1779581495,
  3079819751,
  111262694,
  1274766160,
  443224088,
  298511866,
  1025883608,
  3806446537,
  1145181785,
  168956806,
  3641502830,
  3584813610,
  1689216846,
  3666258015,
  3200248200,
  1692713982,
  2646376535,
  4042768518,
  1618508792,
  1610833997,
  3523052358,
  4130873264,
  2001055236,
  3610705100,
  2202168115,
  4028541809,
  2961195399,
  1006657119,
  2006996926,
  3186142756,
  1430667929,
  3210227297,
  1314452623,
  4074634658,
  4101304120,
  2273951170,
  1399257539,
  3367210612,
  3027628629,
  1190975929,
  2062231137,
  2333990788,
  2221543033,
  2438960610,
  1181637006,
  548689776,
  2362791313,
  3372408396,
  3104550113,
  3145860560,
  296247880,
  1970579870,
  3078560182,
  3769228297,
  1714227617,
  3291629107,
  3898220290,
  166772364,
  1251581989,
  493813264,
  448347421,
  195405023,
  2709975567,
  677966185,
  3703036547,
  1463355134,
  2715995803,
  1338867538,
  1343315457,
  2802222074,
  2684532164,
  233230375,
  2599980071,
  2000651841,
  3277868038,
  1638401717,
  4028070440,
  3237316320,
  6314154,
  819756386,
  300326615,
  590932579,
  1405279636,
  3267499572,
  3150704214,
  2428286686,
  3959192993,
  3461946742,
  1862657033,
  1266418056,
  963775037,
  2089974820,
  2263052895,
  1917689273,
  448879540,
  3550394620,
  3981727096,
  150775221,
  3627908307,
  1303187396,
  508620638,
  2975983352,
  2726630617,
  1817252668,
  1876281319,
  1457606340,
  908771278,
  3720792119,
  3617206836,
  2455994898,
  1729034894,
  1080033504,
  976866871,
  3556439503,
  2881648439,
  1522871579,
  1555064734,
  1336096578,
  3548522304,
  2579274686,
  3574697629,
  3205460757,
  3593280638,
  3338716283,
  3079412587,
  564236357,
  2993598910,
  1781952180,
  1464380207,
  3163844217,
  3332601554,
  1699332808,
  1393555694,
  1183702653,
  3581086237,
  1288719814,
  691649499,
  2847557200,
  2895455976,
  3193889540,
  2717570544,
  1781354906,
  1676643554,
  2592534050,
  3230253752,
  1126444790,
  2770207658,
  2633158820,
  2210423226,
  2615765581,
  2414155088,
  3127139286,
  673620729,
  2805611233,
  1269405062,
  4015350505,
  3341807571,
  4149409754,
  1057255273,
  2012875353,
  2162469141,
  2276492801,
  2601117357,
  993977747,
  3918593370,
  2654263191,
  753973209,
  36408145,
  2530585658,
  25011837,
  3520020182,
  2088578344,
  530523599,
  2918365339,
  1524020338,
  1518925132,
  3760827505,
  3759777254,
  1202760957,
  3985898139,
  3906192525,
  674977740,
  4174734889,
  2031300136,
  2019492241,
  3983892565,
  4153806404,
  3822280332,
  352677332,
  2297720250,
  60907813,
  90501309,
  3286998549,
  1016092578,
  2535922412,
  2839152426,
  457141659,
  509813237,
  4120667899,
  652014361,
  1966332200,
  2975202805,
  55981186,
  2327461051,
  676427537,
  3255491064,
  2882294119,
  3433927263,
  1307055953,
  942726286,
  933058658,
  2468411793,
  3933900994,
  4215176142,
  1361170020,
  2001714738,
  2830558078,
  3274259782,
  1222529897,
  1679025792,
  2729314320,
  3714953764,
  1770335741,
  151462246,
  3013232138,
  1682292957,
  1483529935,
  471910574,
  1539241949,
  458788160,
  3436315007,
  1807016891,
  3718408830,
  978976581,
  1043663428,
  3165965781,
  1927990952,
  4200891579,
  2372276910,
  3208408903,
  3533431907,
  1412390302,
  2931980059,
  4132332400,
  1947078029,
  3881505623,
  4168226417,
  2941484381,
  1077988104,
  1320477388,
  886195818,
  18198404,
  3786409e3,
  2509781533,
  112762804,
  3463356488,
  1866414978,
  891333506,
  18488651,
  661792760,
  1628790961,
  3885187036,
  3141171499,
  876946877,
  2693282273,
  1372485963,
  791857591,
  2686433993,
  3759982718,
  3167212022,
  3472953795,
  2716379847,
  445679433,
  3561995674,
  3504004811,
  3574258232,
  54117162,
  3331405415,
  2381918588,
  3769707343,
  4154350007,
  1140177722,
  4074052095,
  668550556,
  3214352940,
  367459370,
  261225585,
  2610173221,
  4209349473,
  3468074219,
  3265815641,
  314222801,
  3066103646,
  3808782860,
  282218597,
  3406013506,
  3773591054,
  379116347,
  1285071038,
  846784868,
  2669647154,
  3771962079,
  3550491691,
  2305946142,
  453669953,
  1268987020,
  3317592352,
  3279303384,
  3744833421,
  2610507566,
  3859509063,
  266596637,
  3847019092,
  517658769,
  3462560207,
  3443424879,
  370717030,
  4247526661,
  2224018117,
  4143653529,
  4112773975,
  2788324899,
  2477274417,
  1456262402,
  2901442914,
  1517677493,
  1846949527,
  2295493580,
  3734397586,
  2176403920,
  1280348187,
  1908823572,
  3871786941,
  846861322,
  1172426758,
  3287448474,
  3383383037,
  1655181056,
  3139813346,
  901632758,
  1897031941,
  2986607138,
  3066810236,
  3447102507,
  1393639104,
  373351379,
  950779232,
  625454576,
  3124240540,
  4148612726,
  2007998917,
  544563296,
  2244738638,
  2330496472,
  2058025392,
  1291430526,
  424198748,
  50039436,
  29584100,
  3605783033,
  2429876329,
  2791104160,
  1057563949,
  3255363231,
  3075367218,
  3463963227,
  1469046755,
  985887462
];
var C_ORIG = [
  1332899944,
  1700884034,
  1701343084,
  1684370003,
  1668446532,
  1869963892
];
function _encipher(lr, off, P, S) {
  var n, l = lr[off], r = lr[off + 1];
  l ^= P[0];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[1];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[2];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[3];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[4];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[5];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[6];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[7];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[8];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[9];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[10];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[11];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[12];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[13];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[14];
  n = S[l >>> 24];
  n += S[256 | l >> 16 & 255];
  n ^= S[512 | l >> 8 & 255];
  n += S[768 | l & 255];
  r ^= n ^ P[15];
  n = S[r >>> 24];
  n += S[256 | r >> 16 & 255];
  n ^= S[512 | r >> 8 & 255];
  n += S[768 | r & 255];
  l ^= n ^ P[16];
  lr[off] = r ^ P[BLOWFISH_NUM_ROUNDS + 1];
  lr[off + 1] = l;
  return lr;
}
function _streamtoword(data, offp) {
  for (var i = 0, word = 0; i < 4; ++i)
    word = word << 8 | data[offp] & 255, offp = (offp + 1) % data.length;
  return { key: word, offp };
}
function _key(key, P, S) {
  var offset = 0, lr = [0, 0], plen = P.length, slen = S.length, sw;
  for (var i = 0; i < plen; i++)
    sw = _streamtoword(key, offset), offset = sw.offp, P[i] = P[i] ^ sw.key;
  for (i = 0; i < plen; i += 2)
    lr = _encipher(lr, 0, P, S), P[i] = lr[0], P[i + 1] = lr[1];
  for (i = 0; i < slen; i += 2)
    lr = _encipher(lr, 0, P, S), S[i] = lr[0], S[i + 1] = lr[1];
}
function _ekskey(data, key, P, S) {
  var offp = 0, lr = [0, 0], plen = P.length, slen = S.length, sw;
  for (var i = 0; i < plen; i++)
    sw = _streamtoword(key, offp), offp = sw.offp, P[i] = P[i] ^ sw.key;
  offp = 0;
  for (i = 0; i < plen; i += 2)
    sw = _streamtoword(data, offp), offp = sw.offp, lr[0] ^= sw.key, sw = _streamtoword(data, offp), offp = sw.offp, lr[1] ^= sw.key, lr = _encipher(lr, 0, P, S), P[i] = lr[0], P[i + 1] = lr[1];
  for (i = 0; i < slen; i += 2)
    sw = _streamtoword(data, offp), offp = sw.offp, lr[0] ^= sw.key, sw = _streamtoword(data, offp), offp = sw.offp, lr[1] ^= sw.key, lr = _encipher(lr, 0, P, S), S[i] = lr[0], S[i + 1] = lr[1];
}
function _crypt(b, salt, rounds, callback, progressCallback) {
  var cdata = C_ORIG.slice(), clen = cdata.length, err;
  if (rounds < 4 || rounds > 31) {
    err = Error("Illegal number of rounds (4-31): " + rounds);
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  if (salt.length !== BCRYPT_SALT_LEN) {
    err = Error(
      "Illegal salt length: " + salt.length + " != " + BCRYPT_SALT_LEN
    );
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  rounds = 1 << rounds >>> 0;
  var P, S, i = 0, j;
  if (typeof Int32Array === "function") {
    P = new Int32Array(P_ORIG);
    S = new Int32Array(S_ORIG);
  } else {
    P = P_ORIG.slice();
    S = S_ORIG.slice();
  }
  _ekskey(salt, b, P, S);
  function next() {
    if (progressCallback) progressCallback(i / rounds);
    if (i < rounds) {
      var start = Date.now();
      for (; i < rounds; ) {
        i = i + 1;
        _key(b, P, S);
        _key(salt, P, S);
        if (Date.now() - start > MAX_EXECUTION_TIME) break;
      }
    } else {
      for (i = 0; i < 64; i++)
        for (j = 0; j < clen >> 1; j++) _encipher(cdata, j << 1, P, S);
      var ret = [];
      for (i = 0; i < clen; i++)
        ret.push((cdata[i] >> 24 & 255) >>> 0), ret.push((cdata[i] >> 16 & 255) >>> 0), ret.push((cdata[i] >> 8 & 255) >>> 0), ret.push((cdata[i] & 255) >>> 0);
      if (callback) {
        callback(null, ret);
        return;
      } else return ret;
    }
    if (callback) nextTick(next);
  }
  if (typeof callback !== "undefined") {
    next();
  } else {
    var res;
    while (true) if (typeof (res = next()) !== "undefined") return res || [];
  }
}
function _hash(password, salt, callback, progressCallback) {
  var err;
  if (typeof password !== "string" || typeof salt !== "string") {
    err = Error("Invalid string / salt: Not a string");
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  var minor, offset;
  if (salt.charAt(0) !== "$" || salt.charAt(1) !== "2") {
    err = Error("Invalid salt version: " + salt.substring(0, 2));
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  if (salt.charAt(2) === "$") minor = String.fromCharCode(0), offset = 3;
  else {
    minor = salt.charAt(2);
    if (minor !== "a" && minor !== "b" && minor !== "y" || salt.charAt(3) !== "$") {
      err = Error("Invalid salt revision: " + salt.substring(2, 4));
      if (callback) {
        nextTick(callback.bind(this, err));
        return;
      } else throw err;
    }
    offset = 4;
  }
  if (salt.charAt(offset + 2) > "$") {
    err = Error("Missing salt rounds");
    if (callback) {
      nextTick(callback.bind(this, err));
      return;
    } else throw err;
  }
  var r1 = parseInt(salt.substring(offset, offset + 1), 10) * 10, r2 = parseInt(salt.substring(offset + 1, offset + 2), 10), rounds = r1 + r2, real_salt = salt.substring(offset + 3, offset + 25);
  password += minor >= "a" ? "\0" : "";
  var passwordb = utf8Array(password), saltb = base64_decode(real_salt, BCRYPT_SALT_LEN);
  function finish(bytes) {
    var res = [];
    res.push("$2");
    if (minor >= "a") res.push(minor);
    res.push("$");
    if (rounds < 10) res.push("0");
    res.push(rounds.toString());
    res.push("$");
    res.push(base64_encode(saltb, saltb.length));
    res.push(base64_encode(bytes, C_ORIG.length * 4 - 1));
    return res.join("");
  }
  if (typeof callback == "undefined")
    return finish(_crypt(passwordb, saltb, rounds));
  else {
    _crypt(
      passwordb,
      saltb,
      rounds,
      function(err2, bytes) {
        if (err2) callback(err2, null);
        else callback(null, finish(bytes));
      },
      progressCallback
    );
  }
}
function encodeBase64(bytes, length) {
  return base64_encode(bytes, length);
}
function decodeBase64(string, length) {
  return base64_decode(string, length);
}
const bcrypt = {
  setRandomFallback,
  genSaltSync,
  genSalt,
  hashSync,
  hash,
  compareSync,
  compare,
  getRounds,
  getSalt,
  truncates,
  encodeBase64,
  decodeBase64
};
let db = null;
function initDatabase() {
  if (db) return db;
  const dbPath = path.join(app.getPath("userData"), "patholab.db");
  console.log(`Database path: ${dbPath}`);
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  ensureAdminPassword(db);
  return db;
}
function getDb() {
  if (!db) throw new Error("Database not initialized");
  return db;
}
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
function queryAll(sql, params = []) {
  return getDb().prepare(sql).all(...params);
}
function queryOne(sql, params = []) {
  return getDb().prepare(sql).get(...params);
}
function run(sql, params = []) {
  return getDb().prepare(sql).run(...params);
}
function runWithId(sql, params = []) {
  const result = getDb().prepare(sql).run(...params);
  return Number(result.lastInsertRowid);
}
function ensureAdminPassword(database) {
  const correctHash = bcrypt.hashSync("admin123", 10);
  database.prepare("UPDATE users SET password_hash = ? WHERE username = ?").run(correctHash, "admin");
  console.log("Admin password hash updated");
}
function runMigrations(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);
  const migrations = getMigrations();
  for (const migration of migrations) {
    const exists = database.prepare("SELECT 1 FROM _migrations WHERE name = ?").get(migration.name);
    if (!exists) {
      console.log(`Applying migration: ${migration.name}`);
      database.exec(migration.sql);
      database.prepare("INSERT INTO _migrations (name, applied_at) VALUES (?, datetime('now'))").run(migration.name);
    }
  }
}
function getMigrations() {
  return [
    {
      name: "001_initial_schema",
      sql: `
        CREATE TABLE roles (id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL);
        INSERT INTO roles VALUES (1, 'admin'), (2, 'receptionist'), (3, 'technician'), (4, 'pathologist'), (5, 'auditor');

        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          full_name TEXT NOT NULL,
          role_id INTEGER NOT NULL REFERENCES roles(id),
          is_active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL
        );
        INSERT INTO users (username, password_hash, full_name, role_id, created_at) 
        VALUES ('admin', '$2a$10$rOzJqQZQxLhQJaVKD9GEF.fPwvgbRI4Px4xvVhGGzZxo4hfXk.kfS', 'Administrator', 1, datetime('now'));

        CREATE TABLE patients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_uid TEXT UNIQUE NOT NULL,
          full_name TEXT NOT NULL,
          dob TEXT NOT NULL,
          gender TEXT CHECK (gender IN ('M','F','O')) NOT NULL,
          phone TEXT,
          address TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE tests (id INTEGER PRIMARY KEY AUTOINCREMENT, test_code TEXT UNIQUE NOT NULL, is_active INTEGER DEFAULT 1);

        CREATE TABLE test_versions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          test_id INTEGER NOT NULL REFERENCES tests(id),
          test_name TEXT NOT NULL,
          department TEXT NOT NULL,
          method TEXT NOT NULL,
          sample_type TEXT NOT NULL,
          report_group TEXT,
          version_no INTEGER NOT NULL,
          effective_from TEXT NOT NULL,
          created_by INTEGER REFERENCES users(id),
          created_at TEXT NOT NULL
        );

        CREATE TABLE test_parameters (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          test_version_id INTEGER NOT NULL REFERENCES test_versions(id),
          parameter_code TEXT NOT NULL,
          parameter_name TEXT NOT NULL,
          data_type TEXT CHECK (data_type IN ('NUMERIC','TEXT','BOOLEAN','CALCULATED')) NOT NULL,
          unit TEXT,
          decimal_precision INTEGER,
          display_order INTEGER,
          is_mandatory INTEGER DEFAULT 1,
          formula TEXT,
          UNIQUE(test_version_id, parameter_code)
        );

        CREATE TABLE reference_ranges (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          parameter_id INTEGER NOT NULL REFERENCES test_parameters(id),
          gender TEXT CHECK (gender IN ('M','F','A')) NOT NULL,
          age_min_days INTEGER NOT NULL,
          age_max_days INTEGER NOT NULL,
          lower_limit REAL,
          upper_limit REAL,
          display_text TEXT,
          effective_from TEXT NOT NULL
        );

        CREATE TABLE critical_values (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          parameter_id INTEGER NOT NULL REFERENCES test_parameters(id),
          critical_low REAL,
          critical_high REAL
        );

        CREATE TABLE orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_uid TEXT UNIQUE NOT NULL,
          patient_id INTEGER NOT NULL REFERENCES patients(id),
          order_date TEXT NOT NULL
        );

        CREATE TABLE order_tests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL REFERENCES orders(id),
          test_version_id INTEGER NOT NULL REFERENCES test_versions(id),
          status TEXT CHECK (status IN ('ORDERED','RESULT_ENTERED','FINALIZED')) DEFAULT 'ORDERED'
        );

        CREATE TABLE samples (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sample_uid TEXT UNIQUE NOT NULL,
          order_test_id INTEGER NOT NULL REFERENCES order_tests(id),
          collected_at TEXT,
          status TEXT CHECK (status IN ('COLLECTED','RECEIVED','REJECTED')) NOT NULL,
          rejection_reason TEXT
        );

        CREATE TABLE test_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_test_id INTEGER NOT NULL REFERENCES order_tests(id),
          parameter_id INTEGER NOT NULL REFERENCES test_parameters(id),
          result_value TEXT NOT NULL,
          abnormal_flag TEXT CHECK (abnormal_flag IN ('NORMAL','HIGH','LOW','CRITICAL')),
          status TEXT CHECK (status IN ('DRAFT','ENTERED','VERIFIED','FINALIZED')) DEFAULT 'DRAFT',
          source TEXT CHECK (source IN ('MANUAL','ANALYZER')) DEFAULT 'MANUAL',
          entered_by INTEGER REFERENCES users(id),
          entered_at TEXT NOT NULL,
          UNIQUE(order_test_id, parameter_id)
        );

        CREATE TABLE audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entity TEXT NOT NULL,
          entity_id INTEGER,
          action TEXT NOT NULL,
          old_value TEXT,
          new_value TEXT,
          performed_by INTEGER REFERENCES users(id),
          performed_at TEXT NOT NULL
        );
      `
    },
    {
      name: "002_seed_sample_data",
      sql: `
        INSERT INTO tests (test_code, is_active) VALUES ('CBC', 1);
        INSERT INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, created_at)
        VALUES (1, 'Complete Blood Count', 'Hematology', 'Analyzer', 'Blood', 1, datetime('now'), datetime('now'));
        
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory) VALUES 
          (1, 'HB', 'Hemoglobin', 'NUMERIC', 'g/dL', 1, 1),
          (1, 'WBC', 'WBC Count', 'NUMERIC', 'x10³/µL', 2, 1),
          (1, 'RBC', 'RBC Count', 'NUMERIC', 'x10⁶/µL', 3, 1),
          (1, 'PLT', 'Platelet Count', 'NUMERIC', 'x10⁵/µL', 4, 1),
          (1, 'HCT', 'Hematocrit', 'NUMERIC', '%', 5, 1);

        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES 
          (1, 'M', 365, 36500, 13.0, 17.0, datetime('now')),
          (1, 'F', 365, 36500, 12.0, 15.0, datetime('now')),
          (1, 'A', 0, 364, 10.0, 14.0, datetime('now'));

        INSERT INTO critical_values (parameter_id, critical_low, critical_high) VALUES (1, 7.0, 20.0);

        INSERT INTO tests (test_code, is_active) VALUES ('LFT', 1), ('RFT', 1);
        INSERT INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, created_at) VALUES
          (2, 'Liver Function Test', 'Biochemistry', 'Analyzer', 'Serum', 1, datetime('now'), datetime('now')),
          (3, 'Renal Function Test', 'Biochemistry', 'Analyzer', 'Serum', 1, datetime('now'), datetime('now'));

        INSERT INTO patients (patient_uid, full_name, dob, gender, phone, created_at)
        VALUES ('PID-10231', 'Rahul Sharma', '1986-03-15', 'M', '9876543210', datetime('now'));
      `
    },
    {
      name: "003_billing_columns",
      sql: `
        ALTER TABLE orders ADD COLUMN total_amount REAL DEFAULT 0;
        ALTER TABLE orders ADD COLUMN discount REAL DEFAULT 0;
        ALTER TABLE orders ADD COLUMN net_amount REAL DEFAULT 0;
        ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'PENDING';
        ALTER TABLE order_tests ADD COLUMN price REAL DEFAULT 0;
        ALTER TABLE samples ADD COLUMN received_at TEXT;
      `
    }
  ];
}
let currentSession = null;
async function login(username, password) {
  var _a;
  console.log("AuthService: login attempt for user:", username);
  try {
    const user = queryOne(`
      SELECT u.id, u.username, u.password_hash, u.full_name, u.role_id, r.name as role_name, u.is_active
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.username = ? AND u.is_active = 1
    `, [username]);
    console.log("AuthService: user found:", user ? { id: user.id, username: user.username, hashLength: (_a = user.password_hash) == null ? void 0 : _a.length } : "NOT FOUND");
    if (!user) {
      return { success: false, error: "Invalid username or password" };
    }
    console.log("AuthService: comparing password with hash...");
    const valid = await bcrypt.compare(password, user.password_hash);
    console.log("AuthService: password valid:", valid);
    if (!valid) {
      return { success: false, error: "Invalid username or password" };
    }
    currentSession = {
      userId: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role_name
    };
    logAudit("user", user.id, "login");
    console.log("AuthService: login successful, session created");
    return { success: true, session: currentSession };
  } catch (error) {
    console.error("AuthService: Login error:", error);
    return { success: false, error: "Login failed" };
  }
}
function logout() {
  if (currentSession) {
    logAudit("user", currentSession.userId, "logout");
    currentSession = null;
  }
}
function getSession() {
  return currentSession;
}
function logAudit(entity, entityId, action) {
  try {
    run(
      `INSERT INTO audit_log (entity, entity_id, action, performed_by, performed_at) VALUES (?, ?, ?, ?, datetime('now'))`,
      [entity, entityId, action, (currentSession == null ? void 0 : currentSession.userId) ?? null]
    );
  } catch (e) {
    console.error("Audit log error:", e);
  }
}
function listPatients() {
  return queryAll("SELECT * FROM patients ORDER BY created_at DESC");
}
function getPatient(id) {
  return queryOne("SELECT * FROM patients WHERE id = ?", [id]);
}
function searchPatients(query) {
  const like = `%${query}%`;
  return queryAll(
    `SELECT * FROM patients WHERE full_name LIKE ? OR patient_uid LIKE ? OR phone LIKE ? ORDER BY full_name`,
    [like, like, like]
  );
}
function createPatient(data) {
  const count = queryOne("SELECT COUNT(*) as cnt FROM patients");
  const uid = `PID-${1e4 + ((count == null ? void 0 : count.cnt) ?? 0) + 1}`;
  return runWithId(
    `INSERT INTO patients (patient_uid, full_name, dob, gender, phone, address, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    [uid, data.fullName, data.dob, data.gender, data.phone ?? null, data.address ?? null]
  );
}
function listTests() {
  return queryAll(`
    SELECT t.*, tv.id as version_id, tv.test_name, tv.department, tv.method, tv.sample_type, tv.version_no
    FROM tests t
    LEFT JOIN test_versions tv ON t.id = tv.test_id
    WHERE t.is_active = 1
    ORDER BY t.test_code
  `);
}
function getTest(testId) {
  return queryOne(`
    SELECT * FROM test_versions WHERE test_id = ? ORDER BY version_no DESC LIMIT 1
  `, [testId]);
}
function getTestParameters(testVersionId) {
  return queryAll(`
    SELECT * FROM test_parameters WHERE test_version_id = ? ORDER BY display_order
  `, [testVersionId]);
}
function listReferenceRanges(parameterId) {
  return queryAll(`
    SELECT * FROM reference_ranges WHERE parameter_id = ? ORDER BY gender, age_min_days
  `, [parameterId]);
}
function createReferenceRange(data) {
  const overlaps = queryOne(`
    SELECT COUNT(*) as cnt FROM reference_ranges
    WHERE parameter_id = ? AND gender IN (?, 'A')
    AND NOT (age_max_days < ? OR age_min_days > ?)
  `, [data.parameterId, data.gender, data.ageMinDays, data.ageMaxDays]);
  if (overlaps && overlaps.cnt > 0) {
    throw new Error("Overlapping age range detected");
  }
  return runWithId(`
    INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, display_text, effective_from)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `, [data.parameterId, data.gender, data.ageMinDays, data.ageMaxDays, data.lowerLimit ?? null, data.upperLimit ?? null, data.displayText ?? null]);
}
function updateReferenceRange(id, data) {
  const sets = [];
  const params = [];
  if (data.lowerLimit !== void 0) {
    sets.push("lower_limit = ?");
    params.push(data.lowerLimit);
  }
  if (data.upperLimit !== void 0) {
    sets.push("upper_limit = ?");
    params.push(data.upperLimit);
  }
  if (data.displayText !== void 0) {
    sets.push("display_text = ?");
    params.push(data.displayText);
  }
  if (sets.length > 0) {
    params.push(id);
    run(`UPDATE reference_ranges SET ${sets.join(", ")} WHERE id = ?`, params);
  }
}
function deleteReferenceRange(id) {
  run("DELETE FROM reference_ranges WHERE id = ?", [id]);
}
function listOrders(limit = 50, offset = 0) {
  return queryAll(`
    SELECT o.*, p.full_name as patient_name, p.patient_uid
    FROM orders o
    JOIN patients p ON o.patient_id = p.id
    ORDER BY o.order_date DESC
    LIMIT ? OFFSET ?
  `, [limit, offset]);
}
function getOrder(orderId) {
  const order = queryOne(`
    SELECT o.*, p.full_name as patient_name, p.patient_uid
    FROM orders o
    JOIN patients p ON o.patient_id = p.id
    WHERE o.id = ?
  `, [orderId]);
  if (!order) return null;
  const tests = queryAll(`
    SELECT ot.*, tv.test_name, t.test_code
    FROM order_tests ot
    JOIN test_versions tv ON ot.test_version_id = tv.id
    JOIN tests t ON tv.test_id = t.id
    WHERE ot.order_id = ?
  `, [orderId]);
  return { ...order, tests };
}
function createOrder(data) {
  try {
    const orderUid = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const totalAmount = data.testVersionIds.length * 500;
    const discount = data.discount || 0;
    const netAmount = totalAmount - discount;
    const orderId = runWithId(`
      INSERT INTO orders (order_uid, patient_id, order_date, total_amount, discount, net_amount, payment_status)
      VALUES (?, ?, datetime('now'), ?, ?, ?, 'PENDING')
    `, [orderUid, data.patientId, totalAmount, discount, netAmount]);
    for (const testVersionId of data.testVersionIds) {
      const orderTestId = runWithId(`
        INSERT INTO order_tests (order_id, test_version_id, status, price)
        VALUES (?, ?, 'ORDERED', 500)
      `, [orderId, testVersionId]);
      const sampleUid = `S${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      run(`
        INSERT INTO samples (sample_uid, order_test_id, status, collected_at)
        VALUES (?, ?, 'COLLECTED', datetime('now'))
      `, [sampleUid, orderTestId]);
    }
    return { success: true, orderId, orderUid };
  } catch (error) {
    console.error("Create order error:", error);
    return { success: false, error: error.message };
  }
}
function getPendingOrders() {
  return queryAll(`
    SELECT o.*, p.full_name as patient_name, p.patient_uid
    FROM orders o
    JOIN patients p ON o.patient_id = p.id
    WHERE EXISTS (
      SELECT 1 FROM order_tests ot WHERE ot.order_id = o.id AND ot.status != 'FINALIZED'
    )
    ORDER BY o.order_date DESC
    LIMIT 20
  `);
}
function listSamples(status) {
  let sql = `
    SELECT s.*, o.order_uid, p.full_name as patient_name, tv.test_name
    FROM samples s
    JOIN order_tests ot ON s.order_test_id = ot.id
    JOIN orders o ON ot.order_id = o.id
    JOIN patients p ON o.patient_id = p.id
    JOIN test_versions tv ON ot.test_version_id = tv.id
  `;
  if (status) {
    sql += ` WHERE s.status = ?`;
    sql += ` ORDER BY s.id DESC`;
    return queryAll(sql, [status]);
  }
  sql += ` ORDER BY s.id DESC LIMIT 50`;
  return queryAll(sql);
}
function createSample(orderTestId) {
  try {
    const sampleUid = `S${Date.now().toString(36).toUpperCase()}`;
    const sampleId = runWithId(`
      INSERT INTO samples (sample_uid, order_test_id, status, collected_at)
      VALUES (?, ?, 'COLLECTED', datetime('now'))
    `, [sampleUid, orderTestId]);
    return { success: true, sampleId, sampleUid };
  } catch (error) {
    console.error("Create sample error:", error);
    return { success: false, error: error.message };
  }
}
function receiveSample(sampleId) {
  try {
    run(`UPDATE samples SET status = 'RECEIVED', received_at = datetime('now') WHERE id = ?`, [sampleId]);
    return true;
  } catch {
    return false;
  }
}
function rejectSample(sampleId, reason) {
  try {
    run(`UPDATE samples SET status = 'REJECTED', rejection_reason = ? WHERE id = ?`, [reason, sampleId]);
    return true;
  } catch {
    return false;
  }
}
function getPendingSamples() {
  return queryAll(`
    SELECT s.*, o.order_uid, p.full_name as patient_name, tv.test_name
    FROM samples s
    JOIN order_tests ot ON s.order_test_id = ot.id
    JOIN orders o ON ot.order_id = o.id
    JOIN patients p ON o.patient_id = p.id
    JOIN test_versions tv ON ot.test_version_id = tv.id
    WHERE s.status = 'COLLECTED'
    ORDER BY s.collected_at ASC
  `);
}
const IPC_CHANNELS = {
  // Auth
  AUTH_LOGIN: "auth:login",
  AUTH_LOGOUT: "auth:logout",
  AUTH_GET_SESSION: "auth:getSession",
  // Patients
  PATIENT_CREATE: "patient:create",
  PATIENT_GET: "patient:get",
  PATIENT_SEARCH: "patient:search",
  PATIENT_LIST: "patient:list",
  // Orders
  ORDER_CREATE: "order:create",
  ORDER_GET: "order:get",
  ORDER_LIST: "order:list",
  ORDER_PENDING: "order:pending",
  // Samples
  SAMPLE_CREATE: "sample:create",
  SAMPLE_LIST: "sample:list",
  SAMPLE_RECEIVE: "sample:receive",
  SAMPLE_REJECT: "sample:reject",
  SAMPLE_PENDING: "sample:pending",
  // Tests
  TEST_LIST: "test:list",
  TEST_GET: "test:get",
  // Parameters
  PARAMETER_LIST: "parameter:list",
  // Reference Ranges
  REF_RANGE_LIST: "refRange:list",
  REF_RANGE_CREATE: "refRange:create",
  REF_RANGE_UPDATE: "refRange:update",
  REF_RANGE_DELETE: "refRange:delete"
};
createRequire(import.meta.url);
const __dirname$1 = path$1.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path$1.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path$1.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path$1.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path$1.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  initDatabase();
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    icon: path$1.join(process.env.VITE_PUBLIC || "", "electron-vite.svg"),
    backgroundColor: "#0a0f1a",
    webPreferences: {
      preload: path$1.join(__dirname$1, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path$1.join(RENDERER_DIST, "index.html"));
  }
}
function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, async (_, username, password) => {
    return login(username, password);
  });
  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, () => {
    logout();
    return { success: true };
  });
  ipcMain.handle(IPC_CHANNELS.AUTH_GET_SESSION, () => {
    return getSession();
  });
  ipcMain.handle(IPC_CHANNELS.PATIENT_LIST, () => {
    return listPatients();
  });
  ipcMain.handle(IPC_CHANNELS.PATIENT_GET, (_, id) => {
    return getPatient(id);
  });
  ipcMain.handle(IPC_CHANNELS.PATIENT_SEARCH, (_, query) => {
    return searchPatients(query);
  });
  ipcMain.handle(IPC_CHANNELS.PATIENT_CREATE, (_, data) => {
    return createPatient(data);
  });
  ipcMain.handle(IPC_CHANNELS.TEST_LIST, () => {
    return listTests();
  });
  ipcMain.handle(IPC_CHANNELS.TEST_GET, (_, testId) => {
    return getTest(testId);
  });
  ipcMain.handle(IPC_CHANNELS.PARAMETER_LIST, (_, testVersionId) => {
    return getTestParameters(testVersionId);
  });
  ipcMain.handle(IPC_CHANNELS.REF_RANGE_LIST, (_, parameterId) => {
    return listReferenceRanges(parameterId);
  });
  ipcMain.handle(IPC_CHANNELS.REF_RANGE_CREATE, (_, data) => {
    try {
      return { success: true, id: createReferenceRange(data) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  ipcMain.handle(IPC_CHANNELS.REF_RANGE_UPDATE, (_, id, data) => {
    updateReferenceRange(id, data);
    return { success: true };
  });
  ipcMain.handle(IPC_CHANNELS.REF_RANGE_DELETE, (_, id) => {
    deleteReferenceRange(id);
    return { success: true };
  });
  ipcMain.handle(IPC_CHANNELS.ORDER_LIST, () => {
    return listOrders();
  });
  ipcMain.handle(IPC_CHANNELS.ORDER_GET, (_, orderId) => {
    return getOrder(orderId);
  });
  ipcMain.handle(IPC_CHANNELS.ORDER_CREATE, (_, data) => {
    return createOrder(data);
  });
  ipcMain.handle(IPC_CHANNELS.ORDER_PENDING, () => {
    return getPendingOrders();
  });
  ipcMain.handle(IPC_CHANNELS.SAMPLE_LIST, (_, status) => {
    return listSamples(status);
  });
  ipcMain.handle(IPC_CHANNELS.SAMPLE_CREATE, (_, orderTestId) => {
    return createSample(orderTestId);
  });
  ipcMain.handle(IPC_CHANNELS.SAMPLE_RECEIVE, (_, sampleId) => {
    return receiveSample(sampleId);
  });
  ipcMain.handle(IPC_CHANNELS.SAMPLE_REJECT, (_, sampleId, reason) => {
    return rejectSample(sampleId, reason);
  });
  ipcMain.handle(IPC_CHANNELS.SAMPLE_PENDING, () => {
    return getPendingSamples();
  });
}
app.on("window-all-closed", () => {
  closeDatabase();
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
