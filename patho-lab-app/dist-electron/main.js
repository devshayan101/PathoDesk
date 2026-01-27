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
    },
    {
      name: "004_result_workflow",
      sql: `
        -- Update samples table to support result workflow statuses
        -- SQLite doesn't support ALTER TABLE to modify CHECK constraints, so we need to work around this
        -- The new statuses (DRAFT, SUBMITTED, VERIFIED, FINALIZED) will be allowed even though they're not in the original CHECK
        -- This is acceptable as SQLite CHECK constraints are not strictly enforced in all cases
        
        ALTER TABLE samples ADD COLUMN verified_by INTEGER REFERENCES users(id);
        ALTER TABLE samples ADD COLUMN verified_at TEXT;
        
        -- Note: In production, you should recreate the table with proper constraints
        -- For now, we'll rely on application-level validation for status values
      `
    },
    {
      name: "005_seed_rft_lft_params",
      sql: `
        -- LFT Parameters (Liver Function Test)
        -- Using existing test_version_id = 2 for LFT
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory) VALUES 
          (2, 'TBIL', 'Total Bilirubin', 'NUMERIC', 'mg/dL', 1, 1),
          (2, 'DBIL', 'Direct Bilirubin', 'NUMERIC', 'mg/dL', 2, 1),
          (2, 'IBIL', 'Indirect Bilirubin', 'CALCULATED', 'mg/dL', 3, 1),
          (2, 'SGOT', 'SGOT (AST)', 'NUMERIC', 'U/L', 4, 1),
          (2, 'SGPT', 'SGPT (ALT)', 'NUMERIC', 'U/L', 5, 1),
          (2, 'ALP', 'Alkaline Phosphatase', 'NUMERIC', 'U/L', 6, 1),
          (2, 'PROT', 'Total Protein', 'NUMERIC', 'g/dL', 7, 1),
          (2, 'ALB', 'Albumin', 'NUMERIC', 'g/dL', 8, 1),
          (2, 'GLOB', 'Globulin', 'CALCULATED', 'g/dL', 9, 1),
          (2, 'AG_RATIO', 'A:G Ratio', 'CALCULATED', '', 10, 0);

        -- RFT Parameters (Renal Function Test)
        -- Using existing test_version_id = 3 for RFT
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory) VALUES 
          (3, 'UREA', 'Blood Urea', 'NUMERIC', 'mg/dL', 1, 1),
          (3, 'CREAT', 'Serum Creatinine', 'NUMERIC', 'mg/dL', 2, 1),
          (3, 'URIC', 'Uric Acid', 'NUMERIC', 'mg/dL', 3, 1),
          (3, 'BUN', 'Blood Urea Nitrogen', 'CALCULATED', 'mg/dL', 4, 0),
          (3, 'NA', 'Sodium (Na+)', 'NUMERIC', 'mmol/L', 5, 1),
          (3, 'K', 'Potassium (K+)', 'NUMERIC', 'mmol/L', 6, 1),
          (3, 'CL', 'Chloride (Cl-)', 'NUMERIC', 'mmol/L', 7, 1);

        -- Update formulas
        UPDATE test_parameters SET formula = 'TBIL - DBIL' WHERE parameter_code = 'IBIL';
        UPDATE test_parameters SET formula = 'PROT - ALB' WHERE parameter_code = 'GLOB';
        UPDATE test_parameters SET formula = 'ALB / GLOB' WHERE parameter_code = 'AG_RATIO';
        UPDATE test_parameters SET formula = 'UREA / 2.14' WHERE parameter_code = 'BUN';
      `
    },
    {
      name: "006_test_wizard_support",
      sql: `
        -- Add status and wizard progress tracking to test_versions
        ALTER TABLE test_versions ADD COLUMN status TEXT CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')) DEFAULT 'PUBLISHED';
        ALTER TABLE test_versions ADD COLUMN wizard_step INTEGER DEFAULT 6; 
        -- Default to 6 (completed) for existing tests
        
        -- Add comments/interpretation template to test_versions
        ALTER TABLE test_versions ADD COLUMN interpretation_template TEXT;
        
        -- Ensure tests created via wizard can be identified
        -- We will use status='DRAFT' for ongoing wizard flows
      `
    },
    {
      name: "007_seed_common_tests",
      sql: `
        -- 1. Hematology Updates
        -- 1.1 Update CBC (Test ID 1) - Add missing parameters
        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory) VALUES 
          (1, 'MCV', 'MCV', 'NUMERIC', 'fL', 6, 1),
          (1, 'MCH', 'MCH', 'NUMERIC', 'pg', 7, 1),
          (1, 'MCHC', 'MCHC', 'NUMERIC', 'g/dL', 8, 1),
          (1, 'RDW', 'RDW-CV', 'NUMERIC', '%', 9, 1),
          (1, 'NEUT', 'Neutrophils', 'NUMERIC', '%', 10, 1),
          (1, 'LYMPH', 'Lymphocytes', 'NUMERIC', '%', 11, 1),
          (1, 'MONO', 'Monocytes', 'NUMERIC', '%', 12, 1),
          (1, 'EOS', 'Eosinophils', 'NUMERIC', '%', 13, 1),
          (1, 'BASO', 'Basophils', 'NUMERIC', '%', 14, 1);
        
        -- CBC Reference Ranges (Male/Female/All)
        -- MCV
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) 
        SELECT id, 'A', 0, 36500, 80, 96, datetime('now') FROM test_parameters WHERE parameter_code = 'MCV';
        -- MCH
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) 
        SELECT id, 'A', 0, 36500, 27, 33, datetime('now') FROM test_parameters WHERE parameter_code = 'MCH';
        -- MCHC
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) 
        SELECT id, 'A', 0, 36500, 32, 36, datetime('now') FROM test_parameters WHERE parameter_code = 'MCHC';
        -- RDW
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) 
        SELECT id, 'A', 0, 36500, 11.5, 14.5, datetime('now') FROM test_parameters WHERE parameter_code = 'RDW';
        
        -- DLC Ranges
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) SELECT id, 'A', 0, 36500, 40, 70, datetime('now') FROM test_parameters WHERE parameter_code = 'NEUT';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) SELECT id, 'A', 0, 36500, 20, 40, datetime('now') FROM test_parameters WHERE parameter_code = 'LYMPH';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) SELECT id, 'A', 0, 36500, 2, 8, datetime('now') FROM test_parameters WHERE parameter_code = 'MONO';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) SELECT id, 'A', 0, 36500, 1, 6, datetime('now') FROM test_parameters WHERE parameter_code = 'EOS';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) SELECT id, 'A', 0, 36500, 0, 1, datetime('now') FROM test_parameters WHERE parameter_code = 'BASO';

        -- 1.2 ESR
        INSERT OR IGNORE INTO tests (test_code, is_active) VALUES ('ESR', 1);
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='ESR'), 'Erythrocyte Sedimentation Rate', 'Hematology', 'Westergren', 'Whole Blood', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));
        
        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory)
        VALUES ((SELECT id FROM test_versions WHERE test_name='Erythrocyte Sedimentation Rate'), 'ESR', 'ESR (1st Hour)', 'NUMERIC', 'mm/hr', 1, 1);
        
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from)
        VALUES 
        ((SELECT id FROM test_parameters WHERE parameter_code='ESR'), 'M', 0, 36500, 0, 15, datetime('now')),
        ((SELECT id FROM test_parameters WHERE parameter_code='ESR'), 'F', 0, 36500, 0, 20, datetime('now'));


        -- 2. Biochemistry
        -- 2.1 Glucose (FBS, PPBS, RBS)
        INSERT OR IGNORE INTO tests (test_code, is_active) VALUES ('FBS', 1), ('PPBS', 1), ('RBS', 1);
        
        -- FBS
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='FBS'), 'Fasting Blood Sugar', 'Biochemistry', 'GOD-POD', 'Fluoride Plasma', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));
        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory)
        VALUES ((SELECT id FROM test_versions WHERE test_name='Fasting Blood Sugar'), 'GLU_F', 'Fasting Plasma Glucose', 'NUMERIC', 'mg/dL', 1, 1);
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from)
        VALUES ((SELECT id FROM test_parameters WHERE parameter_code='GLU_F'), 'A', 0, 36500, 70, 99, datetime('now'));

        -- PPBS
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='PPBS'), 'Post Prandial Blood Sugar', 'Biochemistry', 'GOD-POD', 'Fluoride Plasma', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));
        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory)
        VALUES ((SELECT id FROM test_versions WHERE test_name='Post Prandial Blood Sugar'), 'GLU_PP', 'Plasma Glucose (PP)', 'NUMERIC', 'mg/dL', 1, 1);
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, upper_limit, effective_from)
        VALUES ((SELECT id FROM test_parameters WHERE parameter_code='GLU_PP'), 'A', 0, 36500, 140, datetime('now'));

        -- RBS
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='RBS'), 'Random Blood Sugar', 'Biochemistry', 'GOD-POD', 'Fluoride Plasma', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));
        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory)
        VALUES ((SELECT id FROM test_versions WHERE test_name='Random Blood Sugar'), 'GLU_R', 'Random Plasma Glucose', 'NUMERIC', 'mg/dL', 1, 1);
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from)
        VALUES ((SELECT id FROM test_parameters WHERE parameter_code='GLU_R'), 'A', 0, 36500, 70, 140, datetime('now'));


        -- 2.4 Lipid Profile
        INSERT OR IGNORE INTO tests (test_code, is_active) VALUES ('LIPID', 1);
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='LIPID'), 'Lipid Profile', 'Biochemistry', 'Analyzer', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));
        
        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory, formula) VALUES 
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'CHOL', 'Total Cholesterol', 'NUMERIC', 'mg/dL', 1, 1, NULL),
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'TRIG', 'Triglycerides', 'NUMERIC', 'mg/dL', 2, 1, NULL),
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'HDL', 'HDL Cholesterol', 'NUMERIC', 'mg/dL', 3, 1, NULL),
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'LDL', 'LDL Cholesterol', 'NUMERIC', 'mg/dL', 4, 1, NULL),
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'VLDL', 'VLDL Cholesterol', 'NUMERIC', 'mg/dL', 5, 1, NULL),
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'TC_HDL', 'TC / HDL Ratio', 'CALCULATED', 'Ratio', 6, 0, 'CHOL / HDL');

        -- Lipid Ref Ranges
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 200, datetime('now') FROM test_parameters WHERE parameter_code = 'CHOL';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 150, datetime('now') FROM test_parameters WHERE parameter_code = 'TRIG';
        
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, effective_from)
        SELECT id, 'M', 0, 36500, 40, datetime('now') FROM test_parameters WHERE parameter_code = 'HDL';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, effective_from)
        SELECT id, 'F', 0, 36500, 50, datetime('now') FROM test_parameters WHERE parameter_code = 'HDL';
        
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 100, datetime('now') FROM test_parameters WHERE parameter_code = 'LDL';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 5, 40, datetime('now') FROM test_parameters WHERE parameter_code = 'VLDL';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 5.0, datetime('now') FROM test_parameters WHERE parameter_code = 'TC_HDL';

        -- 4. Hormones (Thyroid Profile)
        INSERT OR IGNORE INTO tests (test_code, is_active) VALUES ('TFT', 1);
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='TFT'), 'Thyroid Function Test', 'Immunology', 'CLIA', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));

        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory) VALUES 
          ((SELECT id FROM test_versions WHERE test_name='Thyroid Function Test'), 'T3', 'Triiodothyronine (T3)', 'NUMERIC', 'ng/mL', 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Thyroid Function Test'), 'T4', 'Thyroxine (T4)', 'NUMERIC', 'µg/dL', 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Thyroid Function Test'), 'TSH', 'Thyroid Stimulating Hormone', 'NUMERIC', 'µIU/mL', 3, 1);

        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 0.8, 2.0, datetime('now') FROM test_parameters WHERE parameter_code = 'T3';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 5.0, 12.0, datetime('now') FROM test_parameters WHERE parameter_code = 'T4';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 0.4, 4.0, datetime('now') FROM test_parameters WHERE parameter_code = 'TSH';

        -- 5. Clinical Pathology (Urine Routine)
        INSERT OR IGNORE INTO tests (test_code, is_active) VALUES ('CUE', 1);
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='CUE'), 'Urine Routine Examination', 'Clinical Pathology', 'Microscopy/Dipstick', 'Urine', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));

        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory) VALUES 
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'U_COL', 'Color', 'TEXT', NULL, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'U_APP', 'Appearance', 'TEXT', NULL, 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'U_PH', 'pH', 'NUMERIC', NULL, 3, 0),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'U_SG', 'Specific Gravity', 'NUMERIC', NULL, 4, 0),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'U_PRO', 'Protein', 'TEXT', NULL, 5, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'U_SUG', 'Sugar', 'TEXT', NULL, 6, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'U_RBC', 'RBC', 'TEXT', '/HPF', 7, 0),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'U_PUS', 'Pus Cells', 'TEXT', '/HPF', 8, 0);

        -- 6. Coagulation
        INSERT OR IGNORE INTO tests (test_code, is_active) VALUES ('COAG', 1);
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='COAG'), 'Coagulation Profile', 'Hematology', 'Coagulometer', 'Citrated Plasma', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));

        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory) VALUES 
          ((SELECT id FROM test_versions WHERE test_name='Coagulation Profile'), 'PT', 'Prothrombin Time (PT)', 'NUMERIC', 'sec', 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Coagulation Profile'), 'INR', 'INR', 'NUMERIC', 'Ratio', 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Coagulation Profile'), 'APTT', 'APTT', 'NUMERIC', 'sec', 3, 1);

        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 11, 13.5, datetime('now') FROM test_parameters WHERE parameter_code = 'PT';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 0.8, 1.2, datetime('now') FROM test_parameters WHERE parameter_code = 'INR';
        INSERT OR IGNORE INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from)
        SELECT id, 'A', 0, 36500, 25, 35, datetime('now') FROM test_parameters WHERE parameter_code = 'APTT';

        -- 7. Serology
        INSERT OR IGNORE INTO tests (test_code, is_active) VALUES ('HBSAG', 1), ('HIV', 1), ('WIDAL', 1);

        -- HBsAg
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='HBSAG'), 'HBsAg', 'Serology', 'Immunochromatography', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));
        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory)
        VALUES ((SELECT id FROM test_versions WHERE test_name='HBsAg'), 'HBSAG_RES', 'Result', 'TEXT', NULL, 1, 1);
        
        -- HIV
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='HIV'), 'HIV I & II', 'Serology', 'Immunochromatography', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));
        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory)
        VALUES ((SELECT id FROM test_versions WHERE test_name='HIV I & II'), 'HIV_RES', 'Result', 'TEXT', NULL, 1, 1);

        -- Widal
        INSERT OR IGNORE INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at)
        VALUES ((SELECT id FROM tests WHERE test_code='WIDAL'), 'Widal Test', 'Serology', 'Agglutination', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));
        INSERT OR IGNORE INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, display_order, is_mandatory) VALUES
        ((SELECT id FROM test_versions WHERE test_name='Widal Test'), 'STO', 'Salmonella Typhi O', 'TEXT', NULL, 1, 1),
        ((SELECT id FROM test_versions WHERE test_name='Widal Test'), 'STH', 'Salmonella Typhi H', 'TEXT', NULL, 2, 1),
        ((SELECT id FROM test_versions WHERE test_name='Widal Test'), 'SPA', 'Salmonella Para Typhi AH', 'TEXT', NULL, 3, 1),
        ((SELECT id FROM test_versions WHERE test_name='Widal Test'), 'SPB', 'Salmonella Para Typhi BH', 'TEXT', NULL, 4, 1),
        ((SELECT id FROM test_versions WHERE test_name='Widal Test'), 'WIDAL_IMP', 'Impression', 'TEXT', NULL, 5, 0);

      `
    },
    {
      name: "008_fix_sample_status_constraint",
      sql: `
        -- Recreate samples table with updated CHECK constraint for result workflow statuses
        
        -- 1. Rename existing table
        ALTER TABLE samples RENAME TO samples_old;
        
        -- 2. Create new table with all columns (including those from migrations 003 and 004)
        CREATE TABLE samples (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sample_uid TEXT UNIQUE NOT NULL,
          order_test_id INTEGER NOT NULL REFERENCES order_tests(id),
          collected_at TEXT,
          received_at TEXT,
          status TEXT CHECK (status IN ('COLLECTED','RECEIVED','REJECTED','DRAFT','SUBMITTED','VERIFIED','FINALIZED')) NOT NULL,
          rejection_reason TEXT,
          verified_by INTEGER REFERENCES users(id),
          verified_at TEXT
        );
        
        -- 3. Copy data
        INSERT INTO samples (id, sample_uid, order_test_id, collected_at, received_at, status, rejection_reason, verified_by, verified_at)
        SELECT id, sample_uid, order_test_id, collected_at, received_at, status, rejection_reason, verified_by, verified_at
        FROM samples_old;
        
        -- 4. Drop old table
        DROP TABLE samples_old;
      `
    },
    {
      name: "009_reset_tests_comprehensive",
      sql: `
        -- DANGER: This migration clears ALL test data and re-inserts comprehensive dataset
        -- Warning: This also clears orders, samples, results since they depend on tests!
        
        -- 1. Clear dependent data first (order matters due to foreign keys)
        DELETE FROM test_results;
        DELETE FROM samples;
        DELETE FROM order_tests;
        DELETE FROM orders;
        
        -- 2. Clear test master data
        DELETE FROM critical_values;
        DELETE FROM reference_ranges;
        DELETE FROM test_parameters;
        DELETE FROM test_versions;
        DELETE FROM tests;
        
        -- 2. Insert Tests with unique codes
        -- Hematology
        INSERT INTO tests (test_code, is_active) VALUES 
          ('CBC', 1), ('ESR', 1),
        -- Biochemistry
          ('GLUCOSE', 1), ('RFT', 1), ('LFT', 1), ('LIPID', 1),
        -- Serology
          ('HBSAG', 1), ('HIV', 1), ('CRP', 1), ('ASO', 1), ('WIDAL', 1),
        -- Hormones
          ('TFT', 1), ('PROLACTIN', 1), ('VITD', 1), ('VITB12', 1),
        -- Clinical Pathology
          ('URINE', 1), ('STOOL', 1),
        -- Coagulation
          ('COAG', 1);
        
        -- 3. Insert Test Versions (PUBLISHED)
        INSERT INTO test_versions (test_id, test_name, department, method, sample_type, version_no, effective_from, status, wizard_step, created_at) VALUES
          ((SELECT id FROM tests WHERE test_code='CBC'), 'Complete Blood Count (Hemogram)', 'Hematology', 'Analyzer', 'EDTA Blood', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='ESR'), 'Erythrocyte Sedimentation Rate', 'Hematology', 'Westergren', 'EDTA Blood', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='GLUCOSE'), 'Blood Glucose Panel', 'Biochemistry', 'Analyzer', 'Fluoride Blood', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='RFT'), 'Renal Function Test (KFT)', 'Biochemistry', 'Analyzer', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='LFT'), 'Liver Function Test', 'Biochemistry', 'Analyzer', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='LIPID'), 'Lipid Profile', 'Biochemistry', 'Analyzer', 'Serum (Fasting)', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='HBSAG'), 'Hepatitis B Surface Antigen', 'Serology', 'ELISA', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='HIV'), 'HIV I & II Antibodies', 'Serology', 'ELISA', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='CRP'), 'C-Reactive Protein', 'Serology', 'Turbidimetric', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='ASO'), 'Anti-Streptolysin O Titer', 'Serology', 'Turbidimetric', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='WIDAL'), 'Widal Test', 'Serology', 'Slide Agglutination', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='TFT'), 'Thyroid Function Test', 'Immunology', 'Chemiluminescence', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='PROLACTIN'), 'Prolactin', 'Immunology', 'Chemiluminescence', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='VITD'), 'Vitamin D (25-OH)', 'Immunology', 'Chemiluminescence', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='VITB12'), 'Vitamin B12', 'Immunology', 'Chemiluminescence', 'Serum', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='URINE'), 'Urine Routine Examination', 'Clinical Pathology', 'Microscopy', 'Urine', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='STOOL'), 'Stool Routine Examination', 'Clinical Pathology', 'Microscopy', 'Stool', 1, datetime('now'), 'PUBLISHED', 6, datetime('now')),
          ((SELECT id FROM tests WHERE test_code='COAG'), 'Coagulation Profile', 'Hematology', 'Analyzer', 'Citrate Blood', 1, datetime('now'), 'PUBLISHED', 6, datetime('now'));

        -- 4. Insert Parameters for each test
        -- CBC Parameters
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'HB', 'Hemoglobin', 'NUMERIC', 'g/dL', 1, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'RBC', 'Total RBC Count', 'NUMERIC', 'million/µL', 2, 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'WBC', 'Total WBC Count', 'NUMERIC', 'cells/µL', 0, 3, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'PLT', 'Platelet Count', 'NUMERIC', 'lakh/µL', 2, 4, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'PCV', 'Packed Cell Volume (HCT)', 'NUMERIC', '%', 1, 5, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'MCV', 'Mean Corpuscular Volume', 'NUMERIC', 'fL', 1, 6, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'MCH', 'Mean Corpuscular Hemoglobin', 'NUMERIC', 'pg', 1, 7, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'MCHC', 'MCHC', 'NUMERIC', 'g/dL', 1, 8, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'RDWCV', 'RDW-CV', 'NUMERIC', '%', 1, 9, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'NEUT', 'Neutrophils', 'NUMERIC', '%', 0, 10, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'LYMPH', 'Lymphocytes', 'NUMERIC', '%', 0, 11, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'MONO', 'Monocytes', 'NUMERIC', '%', 0, 12, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'EOS', 'Eosinophils', 'NUMERIC', '%', 0, 13, 1),
          ((SELECT id FROM test_versions WHERE test_name='Complete Blood Count (Hemogram)'), 'BASO', 'Basophils', 'NUMERIC', '%', 0, 14, 1);
          
        -- ESR
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Erythrocyte Sedimentation Rate'), 'ESR1HR', 'ESR - 1st Hour', 'NUMERIC', 'mm/hr', 0, 1, 1);
          
        -- Glucose Panel
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Blood Glucose Panel'), 'FBS', 'Fasting Plasma Glucose', 'NUMERIC', 'mg/dL', 0, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Blood Glucose Panel'), 'PPBS', 'Post-Prandial Blood Sugar', 'NUMERIC', 'mg/dL', 0, 2, 0),
          ((SELECT id FROM test_versions WHERE test_name='Blood Glucose Panel'), 'RBS', 'Random Blood Sugar', 'NUMERIC', 'mg/dL', 0, 3, 0);
          
        -- RFT Parameters
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Renal Function Test (KFT)'), 'UREA', 'Blood Urea', 'NUMERIC', 'mg/dL', 1, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Renal Function Test (KFT)'), 'CREAT', 'Serum Creatinine', 'NUMERIC', 'mg/dL', 2, 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Renal Function Test (KFT)'), 'URIC', 'Uric Acid', 'NUMERIC', 'mg/dL', 1, 3, 1),
          ((SELECT id FROM test_versions WHERE test_name='Renal Function Test (KFT)'), 'NA', 'Sodium', 'NUMERIC', 'mmol/L', 0, 4, 1),
          ((SELECT id FROM test_versions WHERE test_name='Renal Function Test (KFT)'), 'K', 'Potassium', 'NUMERIC', 'mmol/L', 1, 5, 1),
          ((SELECT id FROM test_versions WHERE test_name='Renal Function Test (KFT)'), 'CL', 'Chloride', 'NUMERIC', 'mmol/L', 0, 6, 1);
          
        -- LFT Parameters
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Liver Function Test'), 'TBIL', 'Total Bilirubin', 'NUMERIC', 'mg/dL', 2, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Liver Function Test'), 'DBIL', 'Direct Bilirubin', 'NUMERIC', 'mg/dL', 2, 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Liver Function Test'), 'IBIL', 'Indirect Bilirubin', 'NUMERIC', 'mg/dL', 2, 3, 1),
          ((SELECT id FROM test_versions WHERE test_name='Liver Function Test'), 'SGOT', 'SGOT (AST)', 'NUMERIC', 'U/L', 0, 4, 1),
          ((SELECT id FROM test_versions WHERE test_name='Liver Function Test'), 'SGPT', 'SGPT (ALT)', 'NUMERIC', 'U/L', 0, 5, 1),
          ((SELECT id FROM test_versions WHERE test_name='Liver Function Test'), 'ALP', 'Alkaline Phosphatase', 'NUMERIC', 'U/L', 0, 6, 1),
          ((SELECT id FROM test_versions WHERE test_name='Liver Function Test'), 'TPROT', 'Total Protein', 'NUMERIC', 'g/dL', 1, 7, 1),
          ((SELECT id FROM test_versions WHERE test_name='Liver Function Test'), 'ALB', 'Albumin', 'NUMERIC', 'g/dL', 1, 8, 1),
          ((SELECT id FROM test_versions WHERE test_name='Liver Function Test'), 'GLOB', 'Globulin', 'NUMERIC', 'g/dL', 1, 9, 1),
          ((SELECT id FROM test_versions WHERE test_name='Liver Function Test'), 'AGRATIO', 'A/G Ratio', 'NUMERIC', 'Ratio', 1, 10, 1);
          
        -- Lipid Profile Parameters
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'TCHOL', 'Total Cholesterol', 'NUMERIC', 'mg/dL', 0, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'TG', 'Triglycerides', 'NUMERIC', 'mg/dL', 0, 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'HDL', 'HDL Cholesterol', 'NUMERIC', 'mg/dL', 0, 3, 1),
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'LDL', 'LDL Cholesterol', 'NUMERIC', 'mg/dL', 0, 4, 1),
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'VLDL', 'VLDL Cholesterol', 'NUMERIC', 'mg/dL', 0, 5, 1),
          ((SELECT id FROM test_versions WHERE test_name='Lipid Profile'), 'TCHDL', 'TC/HDL Ratio', 'NUMERIC', 'Ratio', 1, 6, 1);
          
        -- Serology - Simple Qualitative/Quantitative 
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Hepatitis B Surface Antigen'), 'HBSAG', 'HBsAg', 'TEXT', NULL, NULL, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='HIV I & II Antibodies'), 'HIV', 'HIV I & II', 'TEXT', NULL, NULL, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='C-Reactive Protein'), 'CRP', 'CRP', 'NUMERIC', 'mg/L', 1, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Anti-Streptolysin O Titer'), 'ASO', 'ASO Titer', 'NUMERIC', 'IU/mL', 0, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Widal Test'), 'STO', 'Salmonella Typhi O', 'TEXT', NULL, NULL, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Widal Test'), 'STH', 'Salmonella Typhi H', 'TEXT', NULL, NULL, 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Widal Test'), 'SAH', 'Salmonella Para A-H', 'TEXT', NULL, NULL, 3, 1),
          ((SELECT id FROM test_versions WHERE test_name='Widal Test'), 'SBH', 'Salmonella Para B-H', 'TEXT', NULL, NULL, 4, 1);
          
        -- TFT Parameters
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Thyroid Function Test'), 'T3', 'Triiodothyronine (T3)', 'NUMERIC', 'ng/mL', 2, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Thyroid Function Test'), 'T4', 'Thyroxine (T4)', 'NUMERIC', 'µg/dL', 1, 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Thyroid Function Test'), 'TSH', 'TSH', 'NUMERIC', 'µIU/mL', 2, 3, 1);
          
        -- Other Hormones/Vitamins
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Prolactin'), 'PRL', 'Prolactin', 'NUMERIC', 'ng/mL', 1, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Vitamin D (25-OH)'), 'VITD25', 'Vitamin D (25-OH)', 'NUMERIC', 'ng/mL', 1, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Vitamin B12'), 'B12', 'Vitamin B12', 'NUMERIC', 'pg/mL', 0, 1, 1);
          
        -- Urine Routine
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'UCOLOR', 'Color', 'TEXT', NULL, NULL, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'UAPPEAR', 'Appearance', 'TEXT', NULL, NULL, 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'USG', 'Specific Gravity', 'NUMERIC', NULL, 3, 3, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'UPH', 'pH', 'NUMERIC', NULL, 1, 4, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'UPROT', 'Protein', 'TEXT', NULL, NULL, 5, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'USUG', 'Sugar', 'TEXT', NULL, NULL, 6, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'UKET', 'Ketone Bodies', 'TEXT', NULL, NULL, 7, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'URBC', 'Red Blood Cells', 'TEXT', '/HPF', NULL, 8, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'UPUS', 'Pus Cells', 'TEXT', '/HPF', NULL, 9, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'UEPI', 'Epithelial Cells', 'TEXT', NULL, NULL, 10, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'UCAST', 'Casts', 'TEXT', NULL, NULL, 11, 1),
          ((SELECT id FROM test_versions WHERE test_name='Urine Routine Examination'), 'UXTAL', 'Crystals', 'TEXT', NULL, NULL, 12, 1);
          
        -- Stool Routine
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Stool Routine Examination'), 'SCOLOR', 'Color', 'TEXT', NULL, NULL, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Stool Routine Examination'), 'SCONS', 'Consistency', 'TEXT', NULL, NULL, 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Stool Routine Examination'), 'SOCCULT', 'Occult Blood', 'TEXT', NULL, NULL, 3, 1),
          ((SELECT id FROM test_versions WHERE test_name='Stool Routine Examination'), 'SOVA', 'Ova / Cyst', 'TEXT', NULL, NULL, 4, 1),
          ((SELECT id FROM test_versions WHERE test_name='Stool Routine Examination'), 'SRBC', 'RBC', 'TEXT', NULL, NULL, 5, 1),
          ((SELECT id FROM test_versions WHERE test_name='Stool Routine Examination'), 'SPUS', 'Pus Cells', 'TEXT', NULL, NULL, 6, 1);
          
        -- Coagulation
        INSERT INTO test_parameters (test_version_id, parameter_code, parameter_name, data_type, unit, decimal_precision, display_order, is_mandatory) VALUES
          ((SELECT id FROM test_versions WHERE test_name='Coagulation Profile'), 'PT', 'Prothrombin Time', 'NUMERIC', 'sec', 1, 1, 1),
          ((SELECT id FROM test_versions WHERE test_name='Coagulation Profile'), 'INR', 'INR', 'NUMERIC', 'Ratio', 1, 2, 1),
          ((SELECT id FROM test_versions WHERE test_name='Coagulation Profile'), 'APTT', 'APTT', 'NUMERIC', 'sec', 1, 3, 1);

        -- 5. Insert Reference Ranges
        -- CBC Ranges (Gender-specific for HB, RBC, PCV)
        -- Hemoglobin
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='HB'), 'M', 0, 36500, 13.0, 17.0, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='HB'), 'F', 0, 36500, 12.0, 15.0, datetime('now'));
        -- RBC
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='RBC'), 'M', 0, 36500, 4.5, 5.9, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='RBC'), 'F', 0, 36500, 4.1, 5.1, datetime('now'));
        -- WBC (All genders)
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='WBC'), 'A', 0, 36500, 4000, 11000, datetime('now'));
        -- PLT
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='PLT'), 'A', 0, 36500, 1.5, 4.5, datetime('now'));
        -- PCV
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='PCV'), 'M', 0, 36500, 40, 50, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='PCV'), 'F', 0, 36500, 36, 46, datetime('now'));
        -- MCV, MCH, MCHC, RDW-CV (All)
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='MCV'), 'A', 0, 36500, 80, 96, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='MCH'), 'A', 0, 36500, 27, 33, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='MCHC'), 'A', 0, 36500, 32, 36, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='RDWCV'), 'A', 0, 36500, 11.5, 14.5, datetime('now'));
        -- DLC
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='NEUT'), 'A', 0, 36500, 40, 70, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='LYMPH'), 'A', 0, 36500, 20, 40, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='MONO'), 'A', 0, 36500, 2, 8, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='EOS'), 'A', 0, 36500, 1, 6, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='BASO'), 'A', 0, 36500, 0, 1, datetime('now'));
          
        -- ESR Range (Gender-specific)
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='ESR1HR'), 'M', 0, 36500, 0, 15, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='ESR1HR'), 'F', 0, 36500, 0, 20, datetime('now'));
          
        -- Glucose Ranges
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='FBS'), 'A', 0, 36500, 70, 99, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='PPBS'), 'A', 0, 36500, 0, 140, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='RBS'), 'A', 0, 36500, 70, 140, datetime('now'));
          
        -- RFT Ranges (Uric acid is gender-specific)
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='UREA'), 'A', 0, 36500, 15, 40, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='CREAT'), 'A', 0, 36500, 0.6, 1.3, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='URIC'), 'M', 0, 36500, 3.4, 7.0, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='URIC'), 'F', 0, 36500, 2.4, 6.0, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='NA'), 'A', 0, 36500, 135, 145, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='K'), 'A', 0, 36500, 3.5, 5.1, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='CL'), 'A', 0, 36500, 98, 107, datetime('now'));
          
        -- LFT Ranges
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='TBIL'), 'A', 0, 36500, 0.3, 1.2, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='DBIL'), 'A', 0, 36500, 0.0, 0.3, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='IBIL'), 'A', 0, 36500, 0.2, 0.9, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='SGOT'), 'A', 0, 36500, 0, 40, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='SGPT'), 'A', 0, 36500, 0, 41, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='ALP'), 'A', 0, 36500, 44, 147, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='TPROT'), 'A', 0, 36500, 6.0, 8.3, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='ALB'), 'A', 0, 36500, 3.5, 5.0, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='GLOB'), 'A', 0, 36500, 2.0, 3.5, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='AGRATIO'), 'A', 0, 36500, 1.0, 2.2, datetime('now'));
          
        -- Lipid Profile Ranges (HDL is gender-specific)
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='TCHOL'), 'A', 0, 36500, 0, 200, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='TG'), 'A', 0, 36500, 0, 150, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='HDL'), 'M', 0, 36500, 40, 999, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='HDL'), 'F', 0, 36500, 50, 999, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='LDL'), 'A', 0, 36500, 0, 100, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='VLDL'), 'A', 0, 36500, 5, 40, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='TCHDL'), 'A', 0, 36500, 0, 5.0, datetime('now'));
          
        -- Serology Ranges
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='CRP'), 'A', 0, 36500, 0, 6.0, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='ASO'), 'A', 0, 36500, 0, 200, datetime('now'));
          
        -- TFT Ranges
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='T3'), 'A', 0, 36500, 0.8, 2.0, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='T4'), 'A', 0, 36500, 5.0, 12.0, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='TSH'), 'A', 0, 36500, 0.4, 4.0, datetime('now'));
          
        -- Prolactin (gender-specific)
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='PRL'), 'M', 0, 36500, 4, 15, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='PRL'), 'F', 0, 36500, 5, 25, datetime('now'));
          
        -- Vitamins
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='VITD25'), 'A', 0, 36500, 30, 100, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='B12'), 'A', 0, 36500, 200, 900, datetime('now'));
          
        -- Urine Routine - Numeric ranges
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='USG'), 'A', 0, 36500, 1.005, 1.030, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='UPH'), 'A', 0, 36500, 4.5, 8.0, datetime('now'));
          
        -- Coagulation Ranges
        INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, effective_from) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='PT'), 'A', 0, 36500, 11, 13.5, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='INR'), 'A', 0, 36500, 0.8, 1.2, datetime('now')),
          ((SELECT id FROM test_parameters WHERE parameter_code='APTT'), 'A', 0, 36500, 25, 35, datetime('now'));
      `
    },
    {
      name: "010_add_critical_values",
      sql: `
        -- Insert critical values for key parameters
        -- Critical values trigger immediate clinical alerts
        
        -- CBC Critical Values
        INSERT INTO critical_values (parameter_id, critical_low, critical_high) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='HB'), 7.0, 20.0),    -- Hemoglobin
          ((SELECT id FROM test_parameters WHERE parameter_code='WBC'), 2000, 30000), -- WBC
          ((SELECT id FROM test_parameters WHERE parameter_code='PLT'), 0.5, 10.0);   -- Platelets (lakh/µL)
          
        -- Glucose Critical Values
        INSERT INTO critical_values (parameter_id, critical_low, critical_high) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='FBS'), 40, 400),   -- Fasting glucose
          ((SELECT id FROM test_parameters WHERE parameter_code='RBS'), 40, 500);   -- Random glucose
          
        -- RFT Critical Values
        INSERT INTO critical_values (parameter_id, critical_low, critical_high) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='K'), 2.5, 6.5),      -- Potassium
          ((SELECT id FROM test_parameters WHERE parameter_code='NA'), 120, 160),     -- Sodium
          ((SELECT id FROM test_parameters WHERE parameter_code='CREAT'), NULL, 10.0); -- Creatinine (high only)
          
        -- LFT Critical Values
        INSERT INTO critical_values (parameter_id, critical_low, critical_high) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='TBIL'), NULL, 15.0); -- Total Bilirubin
          
        -- Coagulation Critical Values
        INSERT INTO critical_values (parameter_id, critical_low, critical_high) VALUES
          ((SELECT id FROM test_parameters WHERE parameter_code='INR'), NULL, 5.0),
          ((SELECT id FROM test_parameters WHERE parameter_code='PT'), NULL, 30.0);
      `
    },
    {
      name: "011_lab_settings",
      sql: `
        -- Lab settings for report letterhead and configuration
        CREATE TABLE IF NOT EXISTS lab_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          setting_key TEXT UNIQUE NOT NULL,
          setting_value TEXT
        );
        
        -- Insert default lab settings
        INSERT INTO lab_settings (setting_key, setting_value) VALUES
          ('lab_name', 'PathoCare Diagnostics'),
          ('address_line1', '123 Medical Complex, Main Road'),
          ('address_line2', 'City - 400001'),
          ('phone', '+91 98765 43210'),
          ('email', 'reports@pathocare.com'),
          ('nabl_accreditation', 'NABL-MC-XXXX'),
          ('report_footer', 'This report is electronically generated and valid without signature.'),
          ('disclaimer', 'Results should be correlated with clinical findings. Consult your physician for interpretation.');
      `
    },
    {
      name: "012_doctors_referral",
      sql: `
        -- Doctors table for referring physicians
        CREATE TABLE IF NOT EXISTS doctors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          doctor_code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          specialty TEXT,
          phone TEXT,
          clinic_address TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        
        -- Add referring doctor to orders
        ALTER TABLE orders ADD COLUMN referring_doctor_id INTEGER REFERENCES doctors(id);
        
        -- Insert sample doctors
        INSERT INTO doctors (doctor_code, name, specialty, phone) VALUES
          ('DR001', 'Dr. Ramesh Kumar', 'General Physician', '+91 98765 11111'),
          ('DR002', 'Dr. Priya Sharma', 'Cardiologist', '+91 98765 22222'),
          ('DR003', 'Dr. Suresh Patel', 'Orthopedic', '+91 98765 33333');
      `
    },
    {
      name: "013_billing_pricing",
      sql: `
        -- Price Lists (Standard, Corporate, Camp, Custom)
        CREATE TABLE IF NOT EXISTS price_lists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          is_default INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        
        -- Test Prices per Price List
        CREATE TABLE IF NOT EXISTS test_prices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          price_list_id INTEGER NOT NULL REFERENCES price_lists(id),
          test_id INTEGER NOT NULL REFERENCES tests(id),
          base_price REAL NOT NULL,
          auto_discount_percent REAL DEFAULT 0,
          discount_cap_percent REAL DEFAULT 100,
          gst_applicable INTEGER DEFAULT 0,
          gst_rate REAL DEFAULT 0,
          effective_from TEXT NOT NULL,
          effective_to TEXT,
          is_active INTEGER DEFAULT 1,
          UNIQUE(price_list_id, test_id, effective_from)
        );
        
        -- Packages (commercial bundles)
        CREATE TABLE IF NOT EXISTS packages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          package_price REAL NOT NULL,
          price_list_id INTEGER REFERENCES price_lists(id),
          valid_from TEXT,
          valid_to TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        
        -- Package Items (tests in package)
        CREATE TABLE IF NOT EXISTS package_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          package_id INTEGER NOT NULL REFERENCES packages(id),
          test_id INTEGER NOT NULL REFERENCES tests(id),
          UNIQUE(package_id, test_id)
        );
        
        -- Invoices
        CREATE TABLE IF NOT EXISTS invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_number TEXT UNIQUE NOT NULL,
          order_id INTEGER NOT NULL REFERENCES orders(id),
          patient_id INTEGER NOT NULL REFERENCES patients(id),
          price_list_id INTEGER REFERENCES price_lists(id),
          subtotal REAL NOT NULL,
          discount_amount REAL DEFAULT 0,
          discount_percent REAL DEFAULT 0,
          discount_reason TEXT,
          discount_approved_by INTEGER REFERENCES users(id),
          gst_amount REAL DEFAULT 0,
          total_amount REAL NOT NULL,
          status TEXT CHECK (status IN ('DRAFT','FINALIZED','CANCELLED')) DEFAULT 'DRAFT',
          created_by INTEGER REFERENCES users(id),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          finalized_at TEXT,
          cancelled_at TEXT,
          cancelled_by INTEGER REFERENCES users(id),
          cancellation_reason TEXT
        );
        
        -- Invoice Items (price snapshot)
        CREATE TABLE IF NOT EXISTS invoice_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER NOT NULL REFERENCES invoices(id),
          test_id INTEGER REFERENCES tests(id),
          package_id INTEGER REFERENCES packages(id),
          description TEXT NOT NULL,
          unit_price REAL NOT NULL,
          quantity INTEGER DEFAULT 1,
          discount_amount REAL DEFAULT 0,
          gst_rate REAL DEFAULT 0,
          gst_amount REAL DEFAULT 0,
          line_total REAL NOT NULL
        );
        
        -- Payments
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER NOT NULL REFERENCES invoices(id),
          amount REAL NOT NULL,
          payment_mode TEXT CHECK (payment_mode IN ('CASH','CARD','UPI','CREDIT')) NOT NULL,
          reference_number TEXT,
          payment_date TEXT NOT NULL DEFAULT (datetime('now')),
          received_by INTEGER REFERENCES users(id),
          remarks TEXT
        );
        
        -- Insert default Standard price list
        INSERT INTO price_lists (code, name, description, is_default, is_active) VALUES
          ('STANDARD', 'Standard Price List', 'Default walk-in patient pricing', 1, 1),
          ('CORPORATE', 'Corporate Price List', 'Corporate/company tie-up rates', 0, 1);
        
        -- Add GST and billing settings to lab_settings
        INSERT OR IGNORE INTO lab_settings (setting_key, setting_value) VALUES
          ('gst_enabled', 'false'),
          ('gst_mode', 'exclusive'),
          ('gstin', ''),
          ('discount_approval_threshold', '20');
        
        -- Seed sample test prices for Standard price list
        INSERT INTO test_prices (price_list_id, test_id, base_price, gst_applicable, gst_rate, effective_from)
        SELECT 1, id, 
          CASE test_code
            WHEN 'CBC' THEN 350
            WHEN 'ESR' THEN 100
            WHEN 'GLUCOSE' THEN 80
            WHEN 'RFT' THEN 450
            WHEN 'LFT' THEN 550
            WHEN 'LIPID' THEN 600
            WHEN 'TFT' THEN 800
            WHEN 'HBSAG' THEN 200
            WHEN 'HIV' THEN 250
            WHEN 'CRP' THEN 350
            WHEN 'ASO' THEN 300
            WHEN 'WIDAL' THEN 200
            WHEN 'PROLACTIN' THEN 500
            WHEN 'VITD' THEN 1200
            WHEN 'VITB12' THEN 800
            WHEN 'URINE' THEN 100
            WHEN 'STOOL' THEN 100
            WHEN 'COAG' THEN 450
            ELSE 500
          END,
          0, 0, datetime('now')
        FROM tests WHERE is_active = 1;
        
        -- Seed Corporate prices (10% discount from standard)
        INSERT INTO test_prices (price_list_id, test_id, base_price, auto_discount_percent, gst_applicable, gst_rate, effective_from)
        SELECT 2, id, 
          CASE test_code
            WHEN 'CBC' THEN 315
            WHEN 'ESR' THEN 90
            WHEN 'GLUCOSE' THEN 72
            WHEN 'RFT' THEN 405
            WHEN 'LFT' THEN 495
            WHEN 'LIPID' THEN 540
            WHEN 'TFT' THEN 720
            WHEN 'HBSAG' THEN 180
            WHEN 'HIV' THEN 225
            WHEN 'CRP' THEN 315
            WHEN 'ASO' THEN 270
            WHEN 'WIDAL' THEN 180
            WHEN 'PROLACTIN' THEN 450
            WHEN 'VITD' THEN 1080
            WHEN 'VITB12' THEN 720
            WHEN 'URINE' THEN 90
            WHEN 'STOOL' THEN 90
            WHEN 'COAG' THEN 405
            ELSE 450
          END,
          0, 0, 0, datetime('now')
        FROM tests WHERE is_active = 1;
      `
    },
    {
      name: "014_doctor_pricing_commission",
      sql: `
        -- ========================================
        -- Doctor Referral Pricing & Commission Management
        -- ========================================
        
        -- 1. Extend doctors table with commission configuration
        ALTER TABLE doctors ADD COLUMN commission_model TEXT CHECK (commission_model IN ('PERCENTAGE','FLAT','NONE')) DEFAULT 'NONE';
        ALTER TABLE doctors ADD COLUMN commission_rate REAL DEFAULT 0;
        ALTER TABLE doctors ADD COLUMN price_list_id INTEGER REFERENCES price_lists(id);
        
        -- 2. Doctor Price Lists (for tracking doctor-specific price list assignments)
        CREATE TABLE IF NOT EXISTS doctor_price_lists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          doctor_id INTEGER NOT NULL REFERENCES doctors(id),
          price_list_id INTEGER NOT NULL REFERENCES price_lists(id),
          is_default INTEGER DEFAULT 1,
          effective_from TEXT NOT NULL DEFAULT (datetime('now')),
          effective_to TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(doctor_id, price_list_id, effective_from)
        );
        
        -- 3. Doctor Commissions (commission snapshot per invoice)
        CREATE TABLE IF NOT EXISTS doctor_commissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER NOT NULL REFERENCES invoices(id),
          invoice_item_id INTEGER REFERENCES invoice_items(id),
          doctor_id INTEGER NOT NULL REFERENCES doctors(id),
          patient_id INTEGER NOT NULL REFERENCES patients(id),
          test_id INTEGER REFERENCES tests(id),
          test_description TEXT,
          commission_model TEXT NOT NULL CHECK (commission_model IN ('PERCENTAGE','FLAT')),
          commission_rate REAL NOT NULL,
          test_price REAL NOT NULL,
          commission_amount REAL NOT NULL,
          calculated_at TEXT NOT NULL DEFAULT (datetime('now')),
          settlement_id INTEGER REFERENCES commission_settlements(id),
          is_cancelled INTEGER DEFAULT 0
        );
        
        -- 4. Commission Settlements (monthly payment tracking)
        CREATE TABLE IF NOT EXISTS commission_settlements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          doctor_id INTEGER NOT NULL REFERENCES doctors(id),
          period_month INTEGER NOT NULL,
          period_year INTEGER NOT NULL,
          total_commission REAL NOT NULL,
          paid_amount REAL DEFAULT 0,
          payment_status TEXT CHECK (payment_status IN ('PENDING','PARTIALLY_PAID','PAID')) DEFAULT 'PENDING',
          payment_date TEXT,
          payment_mode TEXT CHECK (payment_mode IN ('CASH','CARD','UPI','CHEQUE','NEFT','RTGS')),
          payment_reference TEXT,
          remarks TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          created_by INTEGER REFERENCES users(id),
          UNIQUE(doctor_id, period_month, period_year)
        );
        
        -- 5. Commission Payments (track individual payments for a settlement)
        CREATE TABLE IF NOT EXISTS commission_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          settlement_id INTEGER NOT NULL REFERENCES commission_settlements(id),
          amount REAL NOT NULL,
          payment_date TEXT NOT NULL DEFAULT (datetime('now')),
          payment_mode TEXT NOT NULL CHECK (payment_mode IN ('CASH','CARD','UPI','CHEQUE','NEFT','RTGS')),
          payment_reference TEXT,
          remarks TEXT,
          created_by INTEGER REFERENCES users(id),
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        
        -- 6. Indexes for performance
        CREATE INDEX idx_doctor_commissions_doctor ON doctor_commissions(doctor_id);
        CREATE INDEX idx_doctor_commissions_invoice ON doctor_commissions(invoice_id);
        CREATE INDEX idx_doctor_commissions_settlement ON doctor_commissions(settlement_id);
        CREATE INDEX idx_commission_settlements_doctor ON commission_settlements(doctor_id);
        CREATE INDEX idx_commission_settlements_period ON commission_settlements(period_year, period_month);
        CREATE INDEX idx_doctor_price_lists_doctor ON doctor_price_lists(doctor_id);
        
        -- 7. Create a default "Doctor Referral" price list
        INSERT OR IGNORE INTO price_lists (code, name, description, is_default, is_active) VALUES
          ('DOCTOR_REFERRAL', 'Doctor Referral Price List', 'Default pricing for doctor-referred patients', 0, 1);
        
        -- 8. Seed doctor referral prices (15% discount from standard for referred patients)
        INSERT OR IGNORE INTO test_prices (price_list_id, test_id, base_price, auto_discount_percent, gst_applicable, gst_rate, effective_from)
        SELECT 
          (SELECT id FROM price_lists WHERE code = 'DOCTOR_REFERRAL'), 
          id, 
          CASE test_code
            WHEN 'CBC' THEN 298
            WHEN 'ESR' THEN 85
            WHEN 'GLUCOSE' THEN 68
            WHEN 'RFT' THEN 383
            WHEN 'LFT' THEN 468
            WHEN 'LIPID' THEN 510
            WHEN 'TFT' THEN 680
            WHEN 'HBSAG' THEN 170
            WHEN 'HIV' THEN 213
            WHEN 'CRP' THEN 298
            WHEN 'ASO' THEN 255
            WHEN 'WIDAL' THEN 170
            WHEN 'PROLACTIN' THEN 425
            WHEN 'VITD' THEN 1020
            WHEN 'VITB12' THEN 680
            WHEN 'URINE' THEN 85
            WHEN 'STOOL' THEN 85
            WHEN 'COAG' THEN 383
            ELSE 425
          END,
          0, 0, 0, datetime('now')
        FROM tests WHERE is_active = 1;
      `
    },
    {
      name: "015_add_referring_doctor_to_orders",
      sql: `
        -- Add referring_doctor_id to orders table (idempotent)
        -- SQLite doesn't support IF NOT EXISTS for columns, so we check via pragma
        -- This will fail silently if column already exists and migration already ran
      `
    },
    {
      name: "016_qc_tables",
      sql: `
        -- QC Parameters: Define what parameters are tracked for QC
        CREATE TABLE IF NOT EXISTS qc_parameters (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          test_id INTEGER NOT NULL REFERENCES tests(id),
          parameter_code TEXT NOT NULL,
          parameter_name TEXT NOT NULL,
          unit TEXT,
          level TEXT CHECK (level IN ('LOW', 'NORMAL', 'HIGH')) NOT NULL,
          target_mean REAL NOT NULL,
          target_sd REAL NOT NULL,
          lot_number TEXT,
          expiry_date TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL,
          created_by INTEGER REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_qc_parameters_test ON qc_parameters(test_id);
        
        -- QC Entries: Daily QC values entered by technicians
        CREATE TABLE IF NOT EXISTS qc_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          qc_parameter_id INTEGER NOT NULL REFERENCES qc_parameters(id),
          entry_date TEXT NOT NULL,
          observed_value REAL NOT NULL,
          deviation_sd REAL,
          status TEXT CHECK (status IN ('PASS', 'WARNING', 'FAIL', 'REJECTED')) DEFAULT 'PASS',
          remarks TEXT,
          entered_by INTEGER NOT NULL REFERENCES users(id),
          entered_at TEXT NOT NULL,
          reviewed_by INTEGER REFERENCES users(id),
          reviewed_at TEXT,
          acceptance_status TEXT CHECK (acceptance_status IN ('PENDING', 'ACCEPTED', 'CORRECTIVE_ACTION')) DEFAULT 'PENDING'
        );
        CREATE INDEX IF NOT EXISTS idx_qc_entries_parameter ON qc_entries(qc_parameter_id);
        CREATE INDEX IF NOT EXISTS idx_qc_entries_date ON qc_entries(entry_date);
        
        -- QC Rules: Westgard rules configuration (optional advanced feature)
        CREATE TABLE IF NOT EXISTS qc_rules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          rule_code TEXT UNIQUE NOT NULL,
          rule_name TEXT NOT NULL,
          description TEXT,
          is_warning INTEGER DEFAULT 0,
          is_rejection INTEGER DEFAULT 1
        );
        
        -- Insert default Westgard rules
        INSERT INTO qc_rules (rule_code, rule_name, description, is_warning, is_rejection) VALUES
          ('1_2s', '1:2s Rule (Warning)', 'Single control exceeds mean ± 2SD', 1, 0),
          ('1_3s', '1:3s Rule', 'Single control exceeds mean ± 3SD', 0, 1),
          ('2_2s', '2:2s Rule', 'Two consecutive controls exceed same mean ± 2SD limit', 0, 1),
          ('R_4s', 'R:4s Rule', 'Range between two controls exceeds 4SD', 0, 1),
          ('4_1s', '4:1s Rule', 'Four consecutive controls exceed same mean ± 1SD limit', 0, 1),
          ('10x', '10x Rule', 'Ten consecutive controls on same side of mean', 0, 1);
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
    logAudit$1("user", user.id, "login");
    console.log("AuthService: login successful, session created");
    return { success: true, session: currentSession };
  } catch (error) {
    console.error("AuthService: Login error:", error);
    return { success: false, error: "Login failed" };
  }
}
function logout() {
  if (currentSession) {
    logAudit$1("user", currentSession.userId, "logout");
    currentSession = null;
  }
}
function getSession() {
  return currentSession;
}
function logAudit$1(entity, entityId, action) {
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
function getTestVersion(versionId) {
  return queryOne("SELECT * FROM test_versions WHERE id = ?", [versionId]);
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
function getDrafts() {
  return queryAll(`
    SELECT t.*, tv.id as version_id, tv.test_name, tv.department, tv.method, tv.sample_type, tv.version_no, tv.wizard_step, tv.status
    FROM test_versions tv
    JOIN tests t ON tv.test_id = t.id
    WHERE tv.status = 'DRAFT'
    ORDER BY tv.created_at DESC
  `);
}
function createTestDraft(data) {
  const existingTest = queryOne("SELECT id FROM tests WHERE test_code = ?", [data.testCode]);
  let testId;
  if (existingTest) {
    testId = existingTest.id;
    const existingDraft = queryOne('SELECT id FROM test_versions WHERE test_id = ? AND status = "DRAFT"', [testId]);
    if (existingDraft) {
      throw new Error(`A draft version for test code ${data.testCode} already exists.`);
    }
  } else {
    testId = runWithId("INSERT INTO tests (test_code, is_active) VALUES (?, 1)", [data.testCode]);
  }
  const currentMaxVersion = queryOne("SELECT MAX(version_no) as max_v FROM test_versions WHERE test_id = ?", [testId]);
  const nextVersion = ((currentMaxVersion == null ? void 0 : currentMaxVersion.max_v) || 0) + 1;
  return runWithId(`
    INSERT INTO test_versions(
      test_id, test_name, department, method, sample_type, report_group,
      version_no, effective_from, status, wizard_step, created_at
    ) VALUES(?, ?, ?, ?, ?, ?, ?, datetime('now'), 'DRAFT', 1, datetime('now'))
  `, [testId, data.testName, data.department, data.method, data.sampleType, data.reportGroup || null, nextVersion]);
}
function updateTestDraft(versionId, data) {
  const sets = [];
  const params = [];
  if (data.test_name) {
    sets.push("test_name = ?");
    params.push(data.test_name);
  }
  if (data.department) {
    sets.push("department = ?");
    params.push(data.department);
  }
  if (data.method) {
    sets.push("method = ?");
    params.push(data.method);
  }
  if (data.sample_type) {
    sets.push("sample_type = ?");
    params.push(data.sample_type);
  }
  if (data.report_group !== void 0) {
    sets.push("report_group = ?");
    params.push(data.report_group);
  }
  if (sets.length > 0) {
    params.push(versionId);
    run(`UPDATE test_versions SET ${sets.join(", ")} WHERE id = ? AND status = 'DRAFT'`, params);
  }
}
function updateWizardStep(versionId, step) {
  run("UPDATE test_versions SET wizard_step = ? WHERE id = ?", [step, versionId]);
}
function saveTestParameters(versionId, parameters) {
  const existingParams = queryAll("SELECT * FROM test_parameters WHERE test_version_id = ?", [versionId]);
  const existingMap = new Map(existingParams.map((p) => [p.parameter_code, p]));
  const inputCodes = new Set(parameters.map((p) => p.parameter_code));
  for (const param of parameters) {
    if (existingMap.has(param.parameter_code)) {
      const existing = existingMap.get(param.parameter_code);
      run(`
        UPDATE test_parameters 
        SET parameter_name = ?, data_type = ?, unit = ?, decimal_precision = ?, 
            display_order = ?, is_mandatory = ?, formula = ?
        WHERE id = ?
      `, [
        param.parameter_name,
        param.data_type,
        param.unit,
        param.decimal_precision,
        param.display_order,
        param.is_mandatory,
        param.formula,
        existing.id
      ]);
    } else {
      run(`
        INSERT INTO test_parameters (
          test_version_id, parameter_code, parameter_name, data_type, 
          unit, decimal_precision, display_order, is_mandatory, formula
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        versionId,
        param.parameter_code,
        param.parameter_name,
        param.data_type,
        param.unit,
        param.decimal_precision,
        param.display_order,
        param.is_mandatory,
        param.formula
      ]);
    }
  }
  const paramsToDelete = existingParams.filter((p) => !inputCodes.has(p.parameter_code));
  if (paramsToDelete.length > 0) {
    const idsToDelete = paramsToDelete.map((p) => p.id);
    const placeholders = idsToDelete.map(() => "?").join(",");
    run(`DELETE FROM reference_ranges WHERE parameter_id IN (${placeholders})`, idsToDelete);
    run(`DELETE FROM test_parameters WHERE id IN (${placeholders})`, idsToDelete);
  }
}
function publishTest(versionId) {
  const params = getTestParameters(versionId);
  if (params.length === 0) throw new Error("Cannot publish test without parameters.");
  run("UPDATE test_versions SET status = 'PUBLISHED', wizard_step = 6 WHERE id = ?", [versionId]);
}
function deleteTest(testId) {
  run("UPDATE tests SET is_active = 0 WHERE id = ?", [testId]);
}
function createDraftFromExisting(testId) {
  const latest = queryOne("SELECT * FROM test_versions WHERE test_id = ? ORDER BY version_no DESC LIMIT 1", [testId]);
  if (!latest) throw new Error("Test version not found");
  if (latest.status === "DRAFT") return latest.id;
  const nextVersion = latest.version_no + 1;
  const newVersionId = runWithId(`
    INSERT INTO test_versions(
      test_id, test_name, department, method, sample_type, report_group,
      version_no, effective_from, status, wizard_step, created_at, interpretation_template
    ) VALUES(?, ?, ?, ?, ?, ?, ?, datetime('now'), 'DRAFT', 1, datetime('now'), ?)
  `, [
    latest.test_id,
    latest.test_name,
    latest.department,
    latest.method,
    latest.sample_type,
    latest.report_group,
    nextVersion,
    latest.interpretation_template || null
  ]);
  const params = getTestParameters(latest.id);
  const paramMap = /* @__PURE__ */ new Map();
  for (const param of params) {
    const newParamId = runWithId(`
      INSERT INTO test_parameters (
        test_version_id, parameter_code, parameter_name, data_type, 
        unit, decimal_precision, display_order, is_mandatory, formula
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newVersionId,
      param.parameter_code,
      param.parameter_name,
      param.data_type,
      param.unit,
      param.decimal_precision,
      param.display_order,
      param.is_mandatory,
      param.formula
    ]);
    paramMap.set(param.parameter_code, newParamId);
  }
  for (const oldParam of params) {
    const newParamId = paramMap.get(oldParam.parameter_code);
    if (newParamId) {
      const ranges = listReferenceRanges(oldParam.id);
      for (const range of ranges) {
        run(`
                INSERT INTO reference_ranges (parameter_id, gender, age_min_days, age_max_days, lower_limit, upper_limit, display_text, effective_from)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
               `, [newParamId, range.gender, range.age_min_days, range.age_max_days, range.lower_limit, range.upper_limit, range.display_text]);
      }
    }
  }
  return newVersionId;
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
      INSERT INTO orders (order_uid, patient_id, order_date, total_amount, discount, net_amount, payment_status, referring_doctor_id)
      VALUES (?, ?, datetime('now'), ?, ?, ?, 'PENDING', ?)
    `, [orderUid, data.patientId, totalAmount, discount, netAmount, data.referringDoctorId || null]);
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
function listUsers() {
  return queryAll(`
    SELECT u.id, u.username, u.full_name, u.role_id, r.name as role_name, u.is_active, u.created_at
    FROM users u
    JOIN roles r ON u.role_id = r.id
    ORDER BY u.created_at DESC
  `);
}
function createUser(data) {
  try {
    const existing = queryOne("SELECT id FROM users WHERE username = ?", [data.username]);
    if (existing) {
      return { success: false, error: "Username already exists" };
    }
    const passwordHash = bcrypt.hashSync(data.password, 10);
    const userId = runWithId(`
      INSERT INTO users (username, password_hash, full_name, role_id, is_active, created_at)
      VALUES (?, ?, ?, ?, 1, datetime('now'))
    `, [data.username, passwordHash, data.fullName, data.roleId]);
    return { success: true, userId };
  } catch (error) {
    console.error("Create user error:", error);
    return { success: false, error: error.message };
  }
}
function updateUser(id, data) {
  try {
    const sets = [];
    const params = [];
    if (data.fullName) {
      sets.push("full_name = ?");
      params.push(data.fullName);
    }
    if (data.roleId) {
      sets.push("role_id = ?");
      params.push(data.roleId);
    }
    if (data.password) {
      sets.push("password_hash = ?");
      params.push(bcrypt.hashSync(data.password, 10));
    }
    if (sets.length > 0) {
      params.push(id);
      run(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, params);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
function toggleUserActive(id) {
  try {
    run("UPDATE users SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?", [id]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
function listRoles() {
  return queryAll("SELECT id, name FROM roles ORDER BY id");
}
function listPendingSamples() {
  return queryAll(`
    SELECT 
      s.id, s.sample_uid, o.order_uid,
      p.id as patient_id, p.full_name as patient_name, p.patient_uid, p.dob as patient_dob, p.gender as patient_gender,
      t.id as test_id, tv.test_name, ot.test_version_id,
      s.status,
      s.received_at,
      d.name as doctor_name
    FROM samples s
    JOIN order_tests ot ON s.order_test_id = ot.id
    JOIN test_versions tv ON ot.test_version_id = tv.id
    JOIN tests t ON tv.test_id = t.id
    JOIN orders o ON ot.order_id = o.id
    JOIN patients p ON o.patient_id = p.id
    LEFT JOIN doctors d ON o.referring_doctor_id = d.id
    WHERE s.status IN ('RECEIVED', 'DRAFT', 'SUBMITTED', 'VERIFIED', 'FINALIZED')
    ORDER BY 
      CASE s.status 
        WHEN 'RECEIVED' THEN 1 
        WHEN 'DRAFT' THEN 2 
        WHEN 'SUBMITTED' THEN 3 
        WHEN 'VERIFIED' THEN 4 
        WHEN 'FINALIZED' THEN 5 
      END,
      s.received_at DESC
  `);
}
function calculateAgeDays(dob) {
  const birthDate = new Date(dob);
  const today = /* @__PURE__ */ new Date();
  const diffMs = today.getTime() - birthDate.getTime();
  return Math.floor(diffMs / (1e3 * 60 * 60 * 24));
}
function getSampleResults(sampleId) {
  const sample = queryOne(`
    SELECT 
      s.id, s.sample_uid, o.order_uid,
      p.id as patient_id, p.full_name as patient_name, p.patient_uid, p.dob as patient_dob, p.gender as patient_gender,
      t.id as test_id, tv.test_name, ot.test_version_id,
      s.status
    FROM samples s
    JOIN order_tests ot ON s.order_test_id = ot.id
    JOIN test_versions tv ON ot.test_version_id = tv.id
    JOIN tests t ON tv.test_id = t.id
    JOIN orders o ON ot.order_id = o.id
    JOIN patients p ON o.patient_id = p.id
    WHERE s.id = ?
  `, [sampleId]);
  if (!sample) return null;
  const ageDays = calculateAgeDays(sample.patient_dob);
  const parameters = queryAll(`
    SELECT 
      tp.id as parameter_id, 
      tp.parameter_code, 
      tp.parameter_name, 
      tp.unit
    FROM test_parameters tp
    WHERE tp.test_version_id = ?
    ORDER BY tp.display_order
  `, [sample.test_version_id]);
  const parametersWithRanges = parameters.map((param) => {
    const refRanges = queryAll(`
      SELECT 
        rr.lower_limit as min_value, 
        rr.upper_limit as max_value, 
        cr.critical_low, 
        cr.critical_high, 
        rr.age_min_days, 
        rr.age_max_days, 
        rr.gender
      FROM reference_ranges rr
      LEFT JOIN critical_values cr ON cr.parameter_id = rr.parameter_id
      WHERE rr.parameter_id = ?
        AND rr.age_min_days <= ?
        AND (rr.age_max_days IS NULL OR rr.age_max_days >= ?)
        AND (rr.gender = ? OR rr.gender = 'A')
      ORDER BY 
        CASE WHEN rr.gender = ? THEN 0 ELSE 1 END,
        rr.age_min_days DESC
      LIMIT 1
    `, [param.parameter_id, ageDays, ageDays, sample.patient_gender, sample.patient_gender]);
    const existingResult = queryOne(`
      SELECT tr.result_value, tr.abnormal_flag
      FROM test_results tr
      JOIN samples s ON tr.order_test_id = s.order_test_id
      WHERE s.id = ? AND tr.parameter_id = ?
    `, [sampleId, param.parameter_id]);
    return {
      parameter_id: param.parameter_id,
      parameter_code: param.parameter_code,
      parameter_name: param.parameter_name,
      unit: param.unit,
      result_value: existingResult == null ? void 0 : existingResult.result_value,
      abnormal_flag: existingResult == null ? void 0 : existingResult.abnormal_flag,
      ref_ranges: refRanges
    };
  });
  const previousResults = getPreviousResults(sample.patient_id, sample.test_id, sampleId);
  return {
    sample_id: sampleId,
    sample_uid: sample.sample_uid,
    patient_id: sample.patient_id,
    patient_name: sample.patient_name,
    patient_uid: sample.patient_uid,
    patient_age_days: ageDays,
    patient_gender: sample.patient_gender,
    test_id: sample.test_id,
    test_name: sample.test_name,
    test_version_id: sample.test_version_id,
    status: sample.status,
    parameters: parametersWithRanges,
    previousResults
  };
}
function getPreviousResults(patientId, testId, currentSampleId) {
  return queryAll(`
    SELECT 
      tp.parameter_code,
      tr.result_value as value,
      s.received_at as test_date
    FROM test_results tr
    JOIN test_parameters tp ON tr.parameter_id = tp.id
    JOIN order_tests ot ON tr.order_test_id = ot.id
    JOIN samples s ON s.order_test_id = ot.id
    JOIN test_versions tv ON ot.test_version_id = tv.id
    JOIN tests t ON tv.test_id = t.id
    JOIN orders o ON ot.order_id = o.id
    WHERE o.patient_id = ?
      AND t.id = ?
      AND s.id != ?
      AND tr.result_value IS NOT NULL
    ORDER BY s.received_at DESC
    LIMIT 1
  `, [patientId, testId, currentSampleId]);
}
function saveResultValues(data) {
  try {
    const sample = queryOne("SELECT order_test_id FROM samples WHERE id = ?", [data.sampleId]);
    if (!sample) throw new Error("Sample not found");
    run("DELETE FROM test_results WHERE order_test_id = ?", [sample.order_test_id]);
    for (const val of data.values) {
      if (!val.value) continue;
      let flag = val.abnormalFlag || null;
      if (flag === "CRITICAL_LOW" || flag === "CRITICAL_HIGH") {
        flag = "CRITICAL";
      }
      runWithId(`
        INSERT INTO test_results (order_test_id, parameter_id, result_value, abnormal_flag, entered_at, entered_by)
        VALUES (?, ?, ?, ?, datetime('now'), ?)
      `, [sample.order_test_id, val.parameterId, val.value, flag, 1]);
    }
    run(`UPDATE samples SET status = 'DRAFT' WHERE id = ?`, [data.sampleId]);
    return { success: true };
  } catch (error) {
    console.error("Save result values error:", error);
    return { success: false, error: error.message };
  }
}
function submitResults(sampleId) {
  try {
    run(`UPDATE samples SET status = 'SUBMITTED' WHERE id = ?`, [sampleId]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
function verifyResults(sampleId, verifiedBy) {
  try {
    run(`
      UPDATE samples 
      SET status = 'VERIFIED', verified_at = datetime('now'), verified_by = ?
      WHERE id = ?
    `, [verifiedBy, sampleId]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
function finalizeResults(sampleId) {
  try {
    run(`UPDATE samples SET status = 'FINALIZED' WHERE id = ?`, [sampleId]);
    run(`
      UPDATE order_tests
      SET status = 'FINALIZED'
      WHERE id = (SELECT order_test_id FROM samples WHERE id = ?)
    `, [sampleId]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
function getLabSettings() {
  const rows = queryAll("SELECT setting_key, setting_value FROM lab_settings");
  const settings = {};
  for (const row of rows) {
    settings[row.setting_key] = row.setting_value || "";
  }
  return settings;
}
function updateLabSetting(key, value) {
  const existing = queryOne("SELECT 1 FROM lab_settings WHERE setting_key = ?", [key]);
  if (existing) {
    const db2 = require("../database/db");
    db2.run("UPDATE lab_settings SET setting_value = ? WHERE setting_key = ?", [value, key]);
  } else {
    const db2 = require("../database/db");
    db2.run("INSERT INTO lab_settings (setting_key, setting_value) VALUES (?, ?)", [key, value]);
  }
}
function getReportData(sampleId) {
  const sample = queryOne(`
    SELECT 
      s.id, s.sample_uid, s.received_at, s.status, s.verified_at,
      u.full_name as verified_by_name
    FROM samples s
    LEFT JOIN users u ON s.verified_by = u.id
    WHERE s.id = ?
  `, [sampleId]);
  if (!sample) return null;
  const orderData = queryOne(`
    SELECT 
      p.id as patient_id, p.patient_uid, p.full_name, p.dob, p.gender, p.phone, p.address,
      t.id as test_id, t.test_code, tv.test_name, tv.department, tv.method, tv.sample_type,
      d.name as doctor_name, d.specialty as doctor_specialty
    FROM samples s
    JOIN order_tests ot ON s.order_test_id = ot.id
    JOIN test_versions tv ON ot.test_version_id = tv.id
    JOIN tests t ON tv.test_id = t.id
    JOIN orders o ON ot.order_id = o.id
    JOIN patients p ON o.patient_id = p.id
    LEFT JOIN doctors d ON o.referring_doctor_id = d.id
    WHERE s.id = ?
  `, [sampleId]);
  if (!orderData) return null;
  const results = queryAll(`
    SELECT 
      tp.parameter_code, tp.parameter_name, 
      tr.result_value, tp.unit, tr.abnormal_flag,
      rr.lower_limit, rr.upper_limit
    FROM samples s
    JOIN order_tests ot ON s.order_test_id = ot.id
    JOIN test_versions tv ON ot.test_version_id = tv.id
    JOIN test_parameters tp ON tp.test_version_id = tv.id
    LEFT JOIN test_results tr ON tr.order_test_id = ot.id AND tr.parameter_id = tp.id
    LEFT JOIN reference_ranges rr ON rr.parameter_id = tp.id 
      AND (rr.gender = ? OR rr.gender = 'A')
    WHERE s.id = ?
    ORDER BY tp.display_order
  `, [orderData.gender, sampleId]);
  const formattedResults = results.map((r) => ({
    parameter_code: r.parameter_code,
    parameter_name: r.parameter_name,
    result_value: r.result_value || "",
    unit: r.unit,
    abnormal_flag: r.abnormal_flag,
    ref_range_text: r.lower_limit !== null && r.upper_limit !== null ? `${r.lower_limit} - ${r.upper_limit}` : r.lower_limit !== null ? `> ${r.lower_limit}` : r.upper_limit !== null ? `< ${r.upper_limit}` : null
  }));
  return {
    sample: {
      id: sample.id,
      sample_uid: sample.sample_uid,
      received_at: sample.received_at,
      status: sample.status,
      verified_at: sample.verified_at,
      verified_by_name: sample.verified_by_name
    },
    patient: {
      id: orderData.patient_id,
      patient_uid: orderData.patient_uid,
      full_name: orderData.full_name,
      dob: orderData.dob,
      gender: orderData.gender,
      phone: orderData.phone,
      address: orderData.address
    },
    test: {
      id: orderData.test_id,
      test_code: orderData.test_code,
      test_name: orderData.test_name,
      department: orderData.department,
      method: orderData.method,
      sample_type: orderData.sample_type
    },
    referringDoctor: orderData.doctor_name ? {
      name: orderData.doctor_name,
      specialty: orderData.doctor_specialty
    } : null,
    results: formattedResults
  };
}
function listDoctors() {
  return queryAll(`
    SELECT d.id, d.doctor_code, d.name, d.specialty, d.phone, d.clinic_address, 
           d.commission_model, d.commission_rate, d.price_list_id, d.is_active, d.created_at,
           COALESCE(SUM(dc.commission_amount), 0) as pending_commission
    FROM doctors d
    LEFT JOIN doctor_commissions dc ON d.id = dc.doctor_id AND dc.settlement_id IS NULL AND dc.is_cancelled = 0
    WHERE d.is_active = 1
    GROUP BY d.id
    ORDER BY d.name ASC
  `);
}
function listAllDoctors() {
  return queryAll(`
    SELECT d.id, d.doctor_code, d.name, d.specialty, d.phone, d.clinic_address, 
           d.commission_model, d.commission_rate, d.price_list_id, d.is_active, d.created_at,
           COALESCE(SUM(dc.commission_amount), 0) as pending_commission
    FROM doctors d
    LEFT JOIN doctor_commissions dc ON d.id = dc.doctor_id AND dc.settlement_id IS NULL AND dc.is_cancelled = 0
    GROUP BY d.id
    ORDER BY d.name ASC
  `);
}
function getDoctor(id) {
  return queryOne("SELECT * FROM doctors WHERE id = ?", [id]) || null;
}
function createDoctor(data) {
  try {
    const id = runWithId(`
      INSERT INTO doctors (
        doctor_code, name, specialty, phone, clinic_address, 
        commission_model, commission_rate, price_list_id, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      data.doctorCode,
      data.name,
      data.specialty || null,
      data.phone || null,
      data.clinicAddress || null,
      data.commissionModel || "NONE",
      data.commissionRate || 0,
      data.priceListId || null
    ]);
    return { success: true, id };
  } catch (error) {
    console.error("Create doctor error:", error);
    return { success: false, error: error.message };
  }
}
function updateDoctor(id, data) {
  try {
    const updates = [];
    const values = [];
    if (data.doctorCode !== void 0) {
      updates.push("doctor_code = ?");
      values.push(data.doctorCode);
    }
    if (data.name !== void 0) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.specialty !== void 0) {
      updates.push("specialty = ?");
      values.push(data.specialty || null);
    }
    if (data.phone !== void 0) {
      updates.push("phone = ?");
      values.push(data.phone || null);
    }
    if (data.clinicAddress !== void 0) {
      updates.push("clinic_address = ?");
      values.push(data.clinicAddress || null);
    }
    if (data.commissionModel !== void 0) {
      updates.push("commission_model = ?");
      values.push(data.commissionModel || "NONE");
    }
    if (data.commissionRate !== void 0) {
      updates.push("commission_rate = ?");
      values.push(data.commissionRate || 0);
    }
    if (data.priceListId !== void 0) {
      updates.push("price_list_id = ?");
      values.push(data.priceListId || null);
    }
    if (updates.length === 0) {
      return { success: true };
    }
    values.push(id);
    run(`UPDATE doctors SET ${updates.join(", ")} WHERE id = ?`, values);
    return { success: true };
  } catch (error) {
    console.error("Update doctor error:", error);
    return { success: false, error: error.message };
  }
}
function toggleDoctorActive(id) {
  try {
    run("UPDATE doctors SET is_active = 1 - is_active WHERE id = ?", [id]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
function searchDoctors(query) {
  return queryAll(`
    SELECT id, doctor_code, name, specialty, phone, clinic_address, is_active, created_at
    FROM doctors
    WHERE is_active = 1 AND (name LIKE ? OR doctor_code LIKE ?)
    ORDER BY name ASC
    LIMIT 20
  `, [`%${query}%`, `%${query}%`]);
}
function listPriceLists() {
  return queryAll(`
    SELECT * FROM price_lists
    WHERE is_active = 1
    ORDER BY is_default DESC, name ASC
  `);
}
function listAllPriceLists() {
  return queryAll(`
    SELECT * FROM price_lists
    ORDER BY is_default DESC, name ASC
  `);
}
function getPriceList(id) {
  return queryOne(`SELECT * FROM price_lists WHERE id = ?`, [id]);
}
function getDefaultPriceList() {
  return queryOne(`SELECT * FROM price_lists WHERE is_default = 1 AND is_active = 1`);
}
function createPriceList(data) {
  try {
    if (data.isDefault) {
      run(`UPDATE price_lists SET is_default = 0`);
    }
    const id = runWithId(`
      INSERT INTO price_lists (code, name, description, is_default)
      VALUES (?, ?, ?, ?)
    `, [data.code, data.name, data.description || null, data.isDefault ? 1 : 0]);
    return { success: true, id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
function updatePriceList(id, data) {
  try {
    const updates = [];
    const params = [];
    if (data.code !== void 0) {
      updates.push("code = ?");
      params.push(data.code);
    }
    if (data.name !== void 0) {
      updates.push("name = ?");
      params.push(data.name);
    }
    if (data.description !== void 0) {
      updates.push("description = ?");
      params.push(data.description);
    }
    if (data.isDefault !== void 0) {
      if (data.isDefault) {
        run(`UPDATE price_lists SET is_default = 0`);
      }
      updates.push("is_default = ?");
      params.push(data.isDefault ? 1 : 0);
    }
    if (data.isActive !== void 0) {
      updates.push("is_active = ?");
      params.push(data.isActive ? 1 : 0);
    }
    if (updates.length > 0) {
      params.push(id);
      run(`UPDATE price_lists SET ${updates.join(", ")} WHERE id = ?`, params);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
function deletePriceList(id) {
  try {
    const invoiceCount = queryOne(`
      SELECT COUNT(*) as count FROM invoices WHERE price_list_id = ?
    `, [id]);
    if (invoiceCount && invoiceCount.count > 0) {
      return { success: false, error: "Cannot delete price list with existing invoices. Deactivate instead." };
    }
    run(`UPDATE price_lists SET is_active = 0 WHERE id = ?`, [id]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
function listTestPrices(priceListId) {
  return queryAll(`
    SELECT tp.*, t.test_code, tv.test_name
    FROM test_prices tp
    JOIN tests t ON tp.test_id = t.id
    JOIN test_versions tv ON t.id = tv.test_id
    WHERE tp.price_list_id = ?
      AND tp.is_active = 1
      AND (tp.effective_to IS NULL OR tp.effective_to >= datetime('now'))
      AND tv.status = 'PUBLISHED'
    GROUP BY tp.test_id
    ORDER BY tv.test_name ASC
  `, [priceListId]);
}
function getTestPrice(testId, priceListId) {
  return queryOne(`
    SELECT tp.*, t.test_code, tv.test_name
    FROM test_prices tp
    JOIN tests t ON tp.test_id = t.id
    JOIN test_versions tv ON t.id = tv.test_id
    WHERE tp.test_id = ?
      AND tp.price_list_id = ?
      AND tp.is_active = 1
      AND tp.effective_from <= datetime('now')
      AND (tp.effective_to IS NULL OR tp.effective_to >= datetime('now'))
    ORDER BY tp.effective_from DESC
    LIMIT 1
  `, [testId, priceListId]);
}
function setTestPrice(priceListId, testId, data) {
  try {
    run(`
      UPDATE test_prices 
      SET is_active = 0 
      WHERE price_list_id = ? AND test_id = ? AND is_active = 1
    `, [priceListId, testId]);
    const id = runWithId(`
      INSERT INTO test_prices (
        price_list_id, test_id, base_price, auto_discount_percent, 
        discount_cap_percent, gst_applicable, gst_rate, effective_from, effective_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      priceListId,
      testId,
      data.basePrice,
      data.autoDiscountPercent || 0,
      data.discountCapPercent || 100,
      data.gstApplicable ? 1 : 0,
      data.gstRate || 0,
      data.effectiveFrom || (/* @__PURE__ */ new Date()).toISOString(),
      data.effectiveTo || null
    ]);
    return { success: true, id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
function bulkSetTestPrices(priceListId, prices) {
  try {
    let count = 0;
    for (const price of prices) {
      const result = setTestPrice(priceListId, price.testId, {
        basePrice: price.basePrice,
        gstApplicable: price.gstApplicable,
        gstRate: price.gstRate
      });
      if (result.success) count++;
    }
    return { success: true, count };
  } catch (error) {
    return { success: false, count: 0, error: error.message };
  }
}
function getTestPricesForTests(testIds, priceListId) {
  const prices = /* @__PURE__ */ new Map();
  if (testIds.length === 0) return prices;
  const placeholders = testIds.map(() => "?").join(",");
  const rows = queryAll(`
    SELECT tp.*, t.test_code, tv.test_name
    FROM test_prices tp
    JOIN tests t ON tp.test_id = t.id
    JOIN test_versions tv ON t.id = tv.test_id
    WHERE tp.test_id IN (${placeholders})
      AND tp.price_list_id = ?
      AND tp.is_active = 1
      AND tp.effective_from <= datetime('now')
      AND (tp.effective_to IS NULL OR tp.effective_to >= datetime('now'))
    ORDER BY tp.effective_from DESC
  `, [...testIds, priceListId]);
  for (const row of rows) {
    if (!prices.has(row.test_id)) {
      prices.set(row.test_id, row);
    }
  }
  return prices;
}
function listPackages(priceListId) {
  if (priceListId) {
    return queryAll(`
      SELECT * FROM packages
      WHERE (price_list_id = ? OR price_list_id IS NULL)
        AND is_active = 1
        AND (valid_to IS NULL OR valid_to >= datetime('now'))
      ORDER BY name ASC
    `, [priceListId]);
  }
  return queryAll(`
    SELECT * FROM packages
    WHERE is_active = 1
    ORDER BY name ASC
  `);
}
function getPackage(id) {
  const pkg = queryOne(`SELECT * FROM packages WHERE id = ?`, [id]);
  if (!pkg) return null;
  const items = queryAll(`
    SELECT pi.test_id, t.test_code, tv.test_name
    FROM package_items pi
    JOIN tests t ON pi.test_id = t.id
    JOIN test_versions tv ON t.id = tv.test_id
    WHERE pi.package_id = ?
      AND tv.status = 'PUBLISHED'
    GROUP BY pi.test_id
  `, [id]);
  return { ...pkg, items };
}
function createPackage(data) {
  try {
    const id = runWithId(`
      INSERT INTO packages (code, name, description, package_price, price_list_id, valid_from, valid_to)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      data.code,
      data.name,
      data.description || null,
      data.packagePrice,
      data.priceListId || null,
      data.validFrom || null,
      data.validTo || null
    ]);
    for (const testId of data.testIds) {
      run(`INSERT INTO package_items (package_id, test_id) VALUES (?, ?)`, [id, testId]);
    }
    return { success: true, id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
function updatePackage(id, data) {
  try {
    const updates = [];
    const params = [];
    if (data.name !== void 0) {
      updates.push("name = ?");
      params.push(data.name);
    }
    if (data.description !== void 0) {
      updates.push("description = ?");
      params.push(data.description);
    }
    if (data.packagePrice !== void 0) {
      updates.push("package_price = ?");
      params.push(data.packagePrice);
    }
    if (data.validTo !== void 0) {
      updates.push("valid_to = ?");
      params.push(data.validTo);
    }
    if (data.isActive !== void 0) {
      updates.push("is_active = ?");
      params.push(data.isActive ? 1 : 0);
    }
    if (updates.length > 0) {
      params.push(id);
      run(`UPDATE packages SET ${updates.join(", ")} WHERE id = ?`, params);
    }
    if (data.testIds !== void 0) {
      run(`DELETE FROM package_items WHERE package_id = ?`, [id]);
      for (const testId of data.testIds) {
        run(`INSERT INTO package_items (package_id, test_id) VALUES (?, ?)`, [id, testId]);
      }
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
function calculateAndRecordCommission(invoiceId, doctorId, patientId) {
  try {
    const doctor = queryOne("SELECT id, commission_model, commission_rate FROM doctors WHERE id = ?", [doctorId]);
    if (!doctor) {
      return { success: false, error: "Doctor not found" };
    }
    if (doctor.commission_model === "NONE" || doctor.commission_rate === 0) {
      return { success: true, totalCommission: 0 };
    }
    const invoiceItems = queryAll(`
      SELECT id, test_id, description, unit_price
      FROM invoice_items
      WHERE invoice_id = ?
    `, [invoiceId]);
    if (invoiceItems.length === 0) {
      return { success: false, error: "No invoice items found" };
    }
    let totalCommission = 0;
    for (const item of invoiceItems) {
      let commissionAmount = 0;
      if (doctor.commission_model === "PERCENTAGE") {
        commissionAmount = item.unit_price * doctor.commission_rate / 100;
      } else if (doctor.commission_model === "FLAT") {
        commissionAmount = doctor.commission_rate;
      }
      run(`
        INSERT INTO doctor_commissions (
          invoice_id, invoice_item_id, doctor_id, patient_id, test_id,
          test_description, commission_model, commission_rate,
          test_price, commission_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invoiceId,
        item.id,
        doctorId,
        patientId,
        item.test_id,
        item.description,
        doctor.commission_model,
        doctor.commission_rate,
        item.unit_price,
        commissionAmount
      ]);
      totalCommission += commissionAmount;
    }
    run(`
      INSERT INTO audit_log (entity, entity_id, action, new_value, performed_at)
      VALUES ('commission', ?, 'CALCULATE', ?, datetime('now'))
    `, [invoiceId, JSON.stringify({ doctorId, totalCommission })]);
    return { success: true, totalCommission };
  } catch (error) {
    console.error("Calculate commission error:", error);
    return { success: false, error: error.message };
  }
}
function reverseCommission(invoiceId) {
  try {
    run(`
      UPDATE doctor_commissions
      SET is_cancelled = 1
      WHERE invoice_id = ?
    `, [invoiceId]);
    run(`
      INSERT INTO audit_log (entity, entity_id, action, performed_at)
      VALUES ('commission', ?, 'REVERSE', datetime('now'))
    `, [invoiceId]);
    return { success: true };
  } catch (error) {
    console.error("Reverse commission error:", error);
    return { success: false, error: error.message };
  }
}
function getDoctorCommissions(doctorId, month, year) {
  let sql = `
    SELECT dc.*
    FROM doctor_commissions dc
    JOIN invoices i ON dc.invoice_id = i.id
    WHERE dc.doctor_id = ? AND dc.is_cancelled = 0
  `;
  const params = [doctorId];
  if (month !== void 0 && year !== void 0) {
    sql += ` AND CAST(strftime('%m', i.created_at) AS INTEGER) = ?`;
    sql += ` AND CAST(strftime('%Y', i.created_at) AS INTEGER) = ?`;
    params.push(month, year);
  }
  sql += ` ORDER BY i.created_at DESC`;
  return queryAll(sql, params);
}
function getMonthlyCommissionSummary(doctorId, month, year) {
  const summary = queryOne(`
    SELECT 
      COALESCE(SUM(dc.commission_amount), 0) as total_commission,
      COUNT(dc.id) as test_count,
      COUNT(DISTINCT dc.patient_id) as patient_count,
      COUNT(DISTINCT dc.invoice_id) as invoice_count
    FROM doctor_commissions dc
    JOIN invoices i ON dc.invoice_id = i.id
    WHERE dc.doctor_id = ?
      AND dc.is_cancelled = 0
      AND CAST(strftime('%m', i.created_at) AS INTEGER) = ?
      AND CAST(strftime('%Y', i.created_at) AS INTEGER) = ?
  `, [doctorId, month, year]);
  return {
    totalCommission: (summary == null ? void 0 : summary.total_commission) || 0,
    testCount: (summary == null ? void 0 : summary.test_count) || 0,
    patientCount: (summary == null ? void 0 : summary.patient_count) || 0,
    invoiceCount: (summary == null ? void 0 : summary.invoice_count) || 0
  };
}
function getCommissionStatement(doctorId, month, year) {
  const doctor = queryOne(`
    SELECT id, name, doctor_code, commission_model, commission_rate
    FROM doctors
    WHERE id = ?
  `, [doctorId]);
  const summary = getMonthlyCommissionSummary(doctorId, month, year);
  const items = queryAll(`
    SELECT 
      p.full_name as patient_name,
      p.patient_uid,
      i.invoice_number,
      i.created_at as invoice_date,
      dc.test_description,
      dc.test_price,
      dc.commission_amount
    FROM doctor_commissions dc
    JOIN invoices i ON dc.invoice_id = i.id
    JOIN patients p ON dc.patient_id = p.id
    WHERE dc.doctor_id = ?
      AND dc.is_cancelled = 0
      AND CAST(strftime('%m', i.created_at) AS INTEGER) = ?
      AND CAST(strftime('%Y', i.created_at) AS INTEGER) = ?
    ORDER BY i.created_at ASC, p.full_name ASC, dc.test_description ASC
  `, [doctorId, month, year]);
  let settlement = null;
  let payments = [];
  const settlementRow = queryOne(`
      SELECT id, paid_amount, payment_status
      FROM commission_settlements
      WHERE doctor_id = ? AND period_month = ? AND period_year = ?
    `, [doctorId, month, year]);
  if (settlementRow) {
    settlement = settlementRow;
    payments = queryAll(`
        SELECT * FROM commission_payments WHERE settlement_id = ? ORDER BY payment_date DESC
      `, [settlementRow.id]);
  }
  return {
    doctor: doctor || null,
    period: { month, year },
    summary,
    items,
    settlement,
    payments
  };
}
function getDoctorsWithPendingCommissions(month, year) {
  return queryAll(`
    SELECT 
      d.id as doctor_id,
      d.name as doctor_name,
      d.doctor_code,
      COALESCE(SUM(dc.commission_amount), 0) as total_commission,
      COUNT(dc.id) as test_count,
      COUNT(DISTINCT dc.patient_id) as patient_count
    FROM doctors d
    JOIN doctor_commissions dc ON d.id = dc.doctor_id
    JOIN invoices i ON dc.invoice_id = i.id
    WHERE dc.is_cancelled = 0
      AND dc.settlement_id IS NULL
      AND CAST(strftime('%m', i.created_at) AS INTEGER) = ?
      AND CAST(strftime('%Y', i.created_at) AS INTEGER) = ?
    GROUP BY d.id, d.name, d.doctor_code
    HAVING total_commission > 0
    ORDER BY d.name ASC
  `, [month, year]);
}
function getOrCreateSettlement(doctorId, month, year, userId) {
  try {
    const existing = queryOne(`
      SELECT id FROM commission_settlements
      WHERE doctor_id = ? AND period_month = ? AND period_year = ?
    `, [doctorId, month, year]);
    if (existing) {
      return { success: true, settlementId: existing.id };
    }
    const summary = getMonthlyCommissionSummary(doctorId, month, year);
    if (summary.totalCommission === 0) {
      return { success: false, error: "No commission to settle for this period" };
    }
    const settlementId = runWithId(`
      INSERT INTO commission_settlements (
        doctor_id, period_month, period_year, total_commission, created_by
      ) VALUES (?, ?, ?, ?, ?)
    `, [doctorId, month, year, summary.totalCommission, userId || null]);
    run(`
      UPDATE doctor_commissions
      SET settlement_id = ?
      WHERE doctor_id = ?
        AND is_cancelled = 0
        AND settlement_id IS NULL
        AND invoice_id IN (
          SELECT id FROM invoices
          WHERE CAST(strftime('%m', created_at) AS INTEGER) = ?
            AND CAST(strftime('%Y', created_at) AS INTEGER) = ?
        )
    `, [settlementId, doctorId, month, year]);
    run(`
      INSERT INTO audit_log (entity, entity_id, action, new_value, performed_by, performed_at)
      VALUES ('settlement', ?, 'CREATE', ?, ?, datetime('now'))
    `, [settlementId, JSON.stringify({ doctorId, month, year, totalCommission: summary.totalCommission }), userId || null]);
    return { success: true, settlementId };
  } catch (error) {
    console.error("Create settlement error:", error);
    return { success: false, error: error.message };
  }
}
function recordSettlementPayment(settlementId, amount, paymentMode, paymentReference, remarks, userId) {
  try {
    const settlement = queryOne(`
      SELECT * FROM commission_settlements WHERE id = ?
    `, [settlementId]);
    if (!settlement) {
      return { success: false, error: "Settlement not found" };
    }
    runWithId(`
      INSERT INTO commission_payments (
        settlement_id, amount, payment_mode, payment_reference, remarks, created_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [settlementId, amount, paymentMode, paymentReference || null, remarks || null, userId || null]);
    const newPaidAmount = settlement.paid_amount + amount;
    const newStatus = newPaidAmount >= settlement.total_commission ? "PAID" : newPaidAmount > 0 ? "PARTIALLY_PAID" : "PENDING";
    run(`
      UPDATE commission_settlements
      SET paid_amount = ?,
          payment_status = ?,
          payment_date = CASE WHEN ? = 'PAID' THEN datetime('now') ELSE payment_date END,
          payment_mode = ?,
          payment_reference = ?
      WHERE id = ?
    `, [newPaidAmount, newStatus, newStatus, paymentMode, paymentReference || null, settlementId]);
    run(`
      INSERT INTO audit_log (entity, entity_id, action, new_value, performed_by, performed_at)
      VALUES ('settlement', ?, 'PAYMENT', ?, ?, datetime('now'))
    `, [settlementId, JSON.stringify({ amount, paymentMode, newPaidAmount, newStatus }), userId || null]);
    return { success: true };
  } catch (error) {
    console.error("Record settlement payment error:", error);
    return { success: false, error: error.message };
  }
}
function getSettlement(settlementId) {
  const settlement = queryOne(`
    SELECT cs.*, d.name as doctor_name, d.doctor_code
    FROM commission_settlements cs
    JOIN doctors d ON cs.doctor_id = d.id
    WHERE cs.id = ?
  `, [settlementId]);
  if (!settlement) return null;
  const payments = queryAll(`
    SELECT cp.*, u.full_name as created_by_name
    FROM commission_payments cp
    LEFT JOIN users u ON cp.created_by = u.id
    WHERE cp.settlement_id = ?
    ORDER BY cp.payment_date DESC
  `, [settlementId]);
  return {
    ...settlement,
    payments
  };
}
function listSettlements(options = {}) {
  const { doctorId, status, year, limit = 50, offset = 0 } = options;
  let sql = `
    SELECT cs.*, d.name as doctor_name, d.doctor_code
    FROM commission_settlements cs
    JOIN doctors d ON cs.doctor_id = d.id
    WHERE 1=1
  `;
  const params = [];
  if (doctorId) {
    sql += ` AND cs.doctor_id = ?`;
    params.push(doctorId);
  }
  if (status) {
    sql += ` AND cs.payment_status = ?`;
    params.push(status);
  }
  if (year) {
    sql += ` AND cs.period_year = ?`;
    params.push(year);
  }
  sql += ` ORDER BY cs.period_year DESC, cs.period_month DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  return queryAll(sql, params);
}
function generateInvoiceNumber() {
  const date = /* @__PURE__ */ new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const prefix = `INV${year}${month}`;
  const lastInvoice = queryOne(`
    SELECT invoice_number FROM invoices 
    WHERE invoice_number LIKE ? || '%'
    ORDER BY invoice_number DESC
    LIMIT 1
  `, [prefix]);
  let seq = "0001";
  if (lastInvoice && lastInvoice.invoice_number) {
    const lastSeq = parseInt(lastInvoice.invoice_number.slice(-4));
    if (!isNaN(lastSeq)) {
      seq = (lastSeq + 1).toString().padStart(4, "0");
    }
  }
  return `${prefix}${seq}`;
}
function listInvoices(options = {}) {
  const { limit = 50, offset = 0, status, patientId, fromDate, toDate } = options;
  let sql = `
    SELECT i.*, 
           p.full_name as patient_name, p.patient_uid,
           pl.name as price_list_name,
           COALESCE(SUM(pay.amount), 0) as amount_paid,
           i.total_amount - COALESCE(SUM(pay.amount), 0) as balance_due
    FROM invoices i
    JOIN patients p ON i.patient_id = p.id
    LEFT JOIN price_lists pl ON i.price_list_id = pl.id
    LEFT JOIN payments pay ON i.id = pay.invoice_id
    WHERE 1=1
  `;
  const params = [];
  if (status) {
    sql += ` AND i.status = ?`;
    params.push(status);
  }
  if (patientId) {
    sql += ` AND i.patient_id = ?`;
    params.push(patientId);
  }
  if (fromDate) {
    sql += ` AND i.created_at >= ?`;
    params.push(fromDate);
  }
  if (toDate) {
    sql += ` AND i.created_at <= ?`;
    params.push(toDate);
  }
  sql += ` GROUP BY i.id ORDER BY i.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  return queryAll(sql, params);
}
function getInvoice(id) {
  const invoice = queryOne(`
    SELECT i.*, 
           p.full_name as patient_name, p.patient_uid, p.phone as patient_phone,
           p.gender as patient_gender, p.dob as patient_dob, p.address as patient_address,
           pl.name as price_list_name,
           d.name as doctor_name,
           u.full_name as created_by_name
    FROM invoices i
    JOIN patients p ON i.patient_id = p.id
    LEFT JOIN price_lists pl ON i.price_list_id = pl.id
    LEFT JOIN orders o ON i.order_id = o.id
    LEFT JOIN doctors d ON o.referring_doctor_id = d.id
    LEFT JOIN users u ON i.created_by = u.id
    WHERE i.id = ?
  `, [id]);
  if (!invoice) return null;
  const items = queryAll(`
    SELECT * FROM invoice_items WHERE invoice_id = ?
  `, [id]);
  const payments = queryAll(`
    SELECT pay.*, u.full_name as received_by_name
    FROM payments pay
    LEFT JOIN users u ON pay.received_by = u.id
    WHERE pay.invoice_id = ?
    ORDER BY pay.payment_date DESC
  `, [id]);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  return {
    ...invoice,
    items,
    payments,
    amount_paid: totalPaid,
    balance_due: invoice.total_amount - totalPaid
  };
}
function getInvoiceByOrder(orderId) {
  return queryOne(`
    SELECT * FROM invoices WHERE order_id = ? AND status != 'CANCELLED'
  `, [orderId]);
}
function createInvoice(data) {
  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const db2 = getDb();
      const existing = getInvoiceByOrder(data.orderId);
      if (existing) {
        return { success: false, error: "Invoice already exists for this order" };
      }
      const testPrices = getTestPricesForTests(data.testIds, data.priceListId);
      let subtotal = 0;
      const items = [];
      for (const testId of data.testIds) {
        const price = testPrices.get(testId);
        if (price) {
          const unitPrice = price.base_price;
          const gstRate = price.gst_applicable ? price.gst_rate : 0;
          const gstAmount = unitPrice * gstRate / 100;
          const lineTotal = unitPrice + gstAmount;
          subtotal += unitPrice;
          items.push({
            testId,
            description: `${price.test_code} - ${price.test_name}`,
            unitPrice,
            gstRate,
            gstAmount,
            lineTotal
          });
        }
      }
      let discountAmount = data.discountAmount || 0;
      if (data.discountPercent && data.discountPercent > 0) {
        discountAmount = subtotal * data.discountPercent / 100;
      }
      const discountedSubtotal = subtotal - discountAmount;
      let totalGst = 0;
      for (const item of items) {
        if (item.gstRate > 0) {
          const proportion = item.unitPrice / subtotal;
          const itemDiscountedPrice = discountedSubtotal * proportion;
          item.gstAmount = itemDiscountedPrice * item.gstRate / 100;
          totalGst += item.gstAmount;
        }
      }
      const totalAmount = discountedSubtotal + totalGst;
      const invoiceNumber = generateInvoiceNumber();
      const invoiceId = runWithId(`
          INSERT INTO invoices (
            invoice_number, order_id, patient_id, price_list_id,
            subtotal, discount_amount, discount_percent, discount_reason, discount_approved_by,
            gst_amount, total_amount, status, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)
        `, [
        invoiceNumber,
        data.orderId,
        data.patientId,
        data.priceListId,
        subtotal,
        discountAmount,
        data.discountPercent || 0,
        data.discountReason || null,
        data.discountApprovedBy || null,
        totalGst,
        totalAmount,
        data.createdBy || null
      ]);
      for (const item of items) {
        run(`
            INSERT INTO invoice_items (
              invoice_id, test_id, description, unit_price, quantity,
              discount_amount, gst_rate, gst_amount, line_total
            ) VALUES (?, ?, ?, ?, 1, 0, ?, ?, ?)
          `, [
          invoiceId,
          item.testId,
          item.description,
          item.unitPrice,
          item.gstRate,
          item.gstAmount,
          item.lineTotal
        ]);
      }
      run(`
          INSERT INTO audit_log (entity, entity_id, action, new_value, performed_by, performed_at)
          VALUES ('invoice', ?, 'CREATE', ?, ?, datetime('now'))
        `, [invoiceId, JSON.stringify({ invoiceNumber, totalAmount }), data.createdBy || null]);
      const order = queryOne(`
          SELECT referring_doctor_id FROM orders WHERE id = ?
        `, [data.orderId]);
      if (order == null ? void 0 : order.referring_doctor_id) {
        const commissionResult = calculateAndRecordCommission(
          invoiceId,
          order.referring_doctor_id,
          data.patientId
        );
        if (!commissionResult.success) {
          console.warn("Commission calculation failed:", commissionResult.error);
        }
      }
      return { success: true, invoiceId, invoiceNumber };
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE" && attempt < maxRetries - 1) {
        console.log(`Invoice number conflict, retrying... (attempt ${attempt + 1})`);
        continue;
      }
      console.error("Create invoice error:", error);
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: "Failed to create invoice after multiple attempts" };
}
function finalizeInvoice(id, userId) {
  try {
    const invoice = queryOne(`SELECT * FROM invoices WHERE id = ?`, [id]);
    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }
    if (invoice.status !== "DRAFT") {
      return { success: false, error: "Only draft invoices can be finalized" };
    }
    run(`
      UPDATE invoices SET status = 'FINALIZED', finalized_at = datetime('now')
      WHERE id = ?
    `, [id]);
    run(`UPDATE orders SET payment_status = 'INVOICED' WHERE id = ?`, [invoice.order_id]);
    run(`
      INSERT INTO audit_log (entity, entity_id, action, performed_by, performed_at)
      VALUES ('invoice', ?, 'FINALIZE', ?, datetime('now'))
    `, [id, userId || null]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
function cancelInvoice(id, reason, userId) {
  try {
    const invoice = queryOne(`SELECT * FROM invoices WHERE id = ?`, [id]);
    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }
    if (invoice.status === "CANCELLED") {
      return { success: false, error: "Invoice is already cancelled" };
    }
    const payments = queryOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE invoice_id = ?
    `, [id]);
    if (payments && payments.total > 0) {
      return { success: false, error: "Cannot cancel invoice with payments. Refund first." };
    }
    run(`
      UPDATE invoices 
      SET status = 'CANCELLED', 
          cancelled_at = datetime('now'),
          cancelled_by = ?,
          cancellation_reason = ?
      WHERE id = ?
    `, [userId, reason, id]);
    reverseCommission(id);
    run(`
      INSERT INTO audit_log (entity, entity_id, action, old_value, new_value, performed_by, performed_at)
      VALUES ('invoice', ?, 'CANCEL', ?, ?, ?, datetime('now'))
    `, [id, invoice.status, reason, userId]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
function getPatientDues(patientId) {
  const invoices = queryAll(`
    SELECT i.*, 
           COALESCE(SUM(pay.amount), 0) as amount_paid,
           i.total_amount - COALESCE(SUM(pay.amount), 0) as balance_due
    FROM invoices i
    LEFT JOIN payments pay ON i.id = pay.invoice_id
    WHERE i.patient_id = ? 
      AND i.status = 'FINALIZED'
    GROUP BY i.id
    HAVING balance_due > 0
    ORDER BY i.created_at ASC
  `, [patientId]);
  const totalDue = invoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
  return { totalDue, invoices };
}
function getInvoiceSummary(fromDate, toDate) {
  const dateFilter = fromDate ? `AND created_at >= '${fromDate}'` : "";
  const toDateFilter = toDate ? `AND created_at <= '${toDate}'` : "";
  const summary = queryOne(`
    SELECT 
      COUNT(*) as total_invoices,
      COALESCE(SUM(total_amount), 0) as total_amount,
      COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id IN (
        SELECT id FROM invoices WHERE status = 'FINALIZED' ${dateFilter} ${toDateFilter}
      )), 0) as total_collected
    FROM invoices
    WHERE status = 'FINALIZED' ${dateFilter} ${toDateFilter}
  `);
  return {
    ...summary,
    total_pending: ((summary == null ? void 0 : summary.total_amount) || 0) - ((summary == null ? void 0 : summary.total_collected) || 0)
  };
}
function recordPayment(data) {
  try {
    const invoice = queryOne(`
      SELECT id, status, total_amount FROM invoices WHERE id = ?
    `, [data.invoiceId]);
    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }
    const paid = queryOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE invoice_id = ?
    `, [data.invoiceId]);
    const currentPaid = (paid == null ? void 0 : paid.total) || 0;
    const remaining = invoice.total_amount - currentPaid;
    if (data.amount > remaining + 0.01) {
      return { success: false, error: `Payment amount exceeds balance. Remaining: ₹${remaining.toFixed(2)}` };
    }
    const paymentId = runWithId(`
      INSERT INTO payments (invoice_id, amount, payment_mode, reference_number, received_by, remarks)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      data.invoiceId,
      data.amount,
      data.paymentMode,
      data.referenceNumber || null,
      data.receivedBy || null,
      data.remarks || null
    ]);
    const newTotal = currentPaid + data.amount;
    if (newTotal >= invoice.total_amount - 0.01) {
      const inv = queryOne(`SELECT order_id FROM invoices WHERE id = ?`, [data.invoiceId]);
      if (inv) {
        run(`UPDATE orders SET payment_status = 'PAID' WHERE id = ?`, [inv.order_id]);
      }
    }
    run(`
      INSERT INTO audit_log (entity, entity_id, action, new_value, performed_by, performed_at)
      VALUES ('payment', ?, 'CREATE', ?, ?, datetime('now'))
    `, [paymentId, JSON.stringify({ amount: data.amount, mode: data.paymentMode }), data.receivedBy || null]);
    return { success: true, paymentId };
  } catch (error) {
    console.error("Record payment error:", error);
    return { success: false, error: error.message };
  }
}
function listPayments(invoiceId) {
  return queryAll(`
    SELECT p.*, u.full_name as received_by_name
    FROM payments p
    LEFT JOIN users u ON p.received_by = u.id
    WHERE p.invoice_id = ?
    ORDER BY p.payment_date DESC
  `, [invoiceId]);
}
function getPayment(id) {
  return queryOne(`
    SELECT p.*, u.full_name as received_by_name
    FROM payments p
    LEFT JOIN users u ON p.received_by = u.id
    WHERE p.id = ?
  `, [id]);
}
function getPatientPaymentHistory(patientId) {
  return queryAll(`
    SELECT p.*, u.full_name as received_by_name, i.invoice_number
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    LEFT JOIN users u ON p.received_by = u.id
    WHERE i.patient_id = ?
    ORDER BY p.payment_date DESC
  `, [patientId]);
}
function getDailyCollection(date) {
  const targetDate = date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const payments = queryAll(`
    SELECT p.*, u.full_name as received_by_name
    FROM payments p
    LEFT JOIN users u ON p.received_by = u.id
    WHERE DATE(p.payment_date) = DATE(?)
    ORDER BY p.payment_date DESC
  `, [targetDate]);
  const totals = {
    totalCash: 0,
    totalCard: 0,
    totalUpi: 0,
    totalCredit: 0,
    grandTotal: 0
  };
  for (const p of payments) {
    totals.grandTotal += p.amount;
    switch (p.payment_mode) {
      case "CASH":
        totals.totalCash += p.amount;
        break;
      case "CARD":
        totals.totalCard += p.amount;
        break;
      case "UPI":
        totals.totalUpi += p.amount;
        break;
      case "CREDIT":
        totals.totalCredit += p.amount;
        break;
    }
  }
  return { ...totals, payments };
}
function getOutstandingDues() {
  return queryAll(`
    SELECT 
      p.id as patient_id,
      p.full_name as patient_name,
      p.patient_uid,
      COALESCE(SUM(i.total_amount), 0) as total_invoiced,
      COALESCE(SUM(paid.total_paid), 0) as total_paid,
      COALESCE(SUM(i.total_amount), 0) - COALESCE(SUM(paid.total_paid), 0) as balance_due,
      MIN(i.created_at) as oldest_invoice_date
    FROM patients p
    JOIN invoices i ON p.id = i.patient_id
    LEFT JOIN (
      SELECT invoice_id, SUM(amount) as total_paid
      FROM payments
      GROUP BY invoice_id
    ) paid ON i.id = paid.invoice_id
    WHERE i.status = 'FINALIZED'
    GROUP BY p.id
    HAVING balance_due > 0
    ORDER BY balance_due DESC
  `);
}
function logAudit(input) {
  const oldValueStr = input.oldValue ? JSON.stringify(input.oldValue) : null;
  const newValueStr = input.newValue ? JSON.stringify(input.newValue) : null;
  return runWithId(`
        INSERT INTO audit_log (entity, entity_id, action, old_value, new_value, performed_by, performed_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
    input.entity,
    input.entityId || null,
    input.action,
    oldValueStr,
    newValueStr,
    input.performedBy || null
  ]);
}
function getAuditLogs(options = {}) {
  const conditions = [];
  const params = [];
  if (options.entity) {
    conditions.push("a.entity = ?");
    params.push(options.entity);
  }
  if (options.entityId) {
    conditions.push("a.entity_id = ?");
    params.push(options.entityId);
  }
  if (options.action) {
    conditions.push("a.action LIKE ?");
    params.push(`%${options.action}%`);
  }
  if (options.userId) {
    conditions.push("a.performed_by = ?");
    params.push(options.userId);
  }
  if (options.fromDate) {
    conditions.push("a.performed_at >= ?");
    params.push(options.fromDate);
  }
  if (options.toDate) {
    conditions.push("a.performed_at <= ?");
    params.push(options.toDate + " 23:59:59");
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const countResult = queryOne(`
        SELECT COUNT(*) as count FROM audit_log a ${whereClause}
    `, params);
  const total = (countResult == null ? void 0 : countResult.count) || 0;
  const limit = options.limit || 50;
  const offset = options.offset || 0;
  const entries = queryAll(`
        SELECT a.*, u.username, u.full_name
        FROM audit_log a
        LEFT JOIN users u ON a.performed_by = u.id
        ${whereClause}
        ORDER BY a.performed_at DESC
        LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
  return { entries, total };
}
function getEntityHistory(entity, entityId) {
  return queryAll(`
        SELECT a.*, u.username, u.full_name
        FROM audit_log a
        LEFT JOIN users u ON a.performed_by = u.id
        WHERE a.entity = ? AND a.entity_id = ?
        ORDER BY a.performed_at DESC
    `, [entity, entityId]);
}
function getRecentActivity(limit = 20) {
  return queryAll(`
        SELECT a.*, u.username, u.full_name
        FROM audit_log a
        LEFT JOIN users u ON a.performed_by = u.id
        ORDER BY a.performed_at DESC
        LIMIT ?
    `, [limit]);
}
function getActivityStats(fromDate, toDate) {
  const totalResult = queryOne(`
        SELECT COUNT(*) as count FROM audit_log 
        WHERE performed_at >= ? AND performed_at <= ?
    `, [fromDate, toDate + " 23:59:59"]);
  const byEntity = queryAll(`
        SELECT entity, COUNT(*) as count FROM audit_log 
        WHERE performed_at >= ? AND performed_at <= ?
        GROUP BY entity ORDER BY count DESC
    `, [fromDate, toDate + " 23:59:59"]);
  const byAction = queryAll(`
        SELECT action, COUNT(*) as count FROM audit_log 
        WHERE performed_at >= ? AND performed_at <= ?
        GROUP BY action ORDER BY count DESC
    `, [fromDate, toDate + " 23:59:59"]);
  const byUser = queryAll(`
        SELECT a.performed_by as userId, COALESCE(u.username, 'System') as username, COUNT(*) as count 
        FROM audit_log a
        LEFT JOIN users u ON a.performed_by = u.id
        WHERE a.performed_at >= ? AND a.performed_at <= ?
        GROUP BY a.performed_by ORDER BY count DESC
    `, [fromDate, toDate + " 23:59:59"]);
  return {
    totalActions: (totalResult == null ? void 0 : totalResult.count) || 0,
    byEntity,
    byAction,
    byUser
  };
}
const ENTITIES = {
  PATIENT: "PATIENT",
  ORDER: "ORDER",
  SAMPLE: "SAMPLE",
  RESULT: "RESULT",
  INVOICE: "INVOICE",
  PAYMENT: "PAYMENT",
  TEST: "TEST",
  USER: "USER",
  DOCTOR: "DOCTOR",
  PRICE_LIST: "PRICE_LIST",
  QC_ENTRY: "QC_ENTRY",
  SETTINGS: "SETTINGS"
};
const ACTIONS = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  VIEW: "VIEW",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  VERIFY: "VERIFY",
  FINALIZE: "FINALIZE",
  CANCEL: "CANCEL",
  SUBMIT: "SUBMIT",
  APPROVE: "APPROVE",
  REJECT: "REJECT"
};
function createQCParameter(data) {
  try {
    const id = runWithId(`
            INSERT INTO qc_parameters (test_id, parameter_code, parameter_name, unit, level, target_mean, target_sd, lot_number, expiry_date, is_active, created_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), ?)
        `, [
      data.testId,
      data.parameterCode,
      data.parameterName,
      data.unit || null,
      data.level,
      data.targetMean,
      data.targetSd,
      data.lotNumber || null,
      data.expiryDate || null,
      data.createdBy || null
    ]);
    logAudit({
      entity: ENTITIES.QC_ENTRY,
      entityId: id,
      action: ACTIONS.CREATE,
      newValue: data,
      performedBy: data.createdBy
    });
    return { success: true, parameterId: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
function updateQCParameter(id, data, userId) {
  try {
    const old = getQCParameter(id);
    if (!old) {
      return { success: false, error: "QC Parameter not found" };
    }
    const updates = [];
    const params = [];
    if (data.parameterCode !== void 0) {
      updates.push("parameter_code = ?");
      params.push(data.parameterCode);
    }
    if (data.parameterName !== void 0) {
      updates.push("parameter_name = ?");
      params.push(data.parameterName);
    }
    if (data.unit !== void 0) {
      updates.push("unit = ?");
      params.push(data.unit);
    }
    if (data.level !== void 0) {
      updates.push("level = ?");
      params.push(data.level);
    }
    if (data.targetMean !== void 0) {
      updates.push("target_mean = ?");
      params.push(data.targetMean);
    }
    if (data.targetSd !== void 0) {
      updates.push("target_sd = ?");
      params.push(data.targetSd);
    }
    if (data.lotNumber !== void 0) {
      updates.push("lot_number = ?");
      params.push(data.lotNumber);
    }
    if (data.expiryDate !== void 0) {
      updates.push("expiry_date = ?");
      params.push(data.expiryDate);
    }
    if (data.isActive !== void 0) {
      updates.push("is_active = ?");
      params.push(data.isActive ? 1 : 0);
    }
    if (updates.length === 0) {
      return { success: true };
    }
    params.push(id);
    run(`UPDATE qc_parameters SET ${updates.join(", ")} WHERE id = ?`, params);
    logAudit({
      entity: ENTITIES.QC_ENTRY,
      entityId: id,
      action: ACTIONS.UPDATE,
      oldValue: old,
      newValue: data,
      performedBy: userId
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
function getQCParameter(id) {
  return queryOne(`
        SELECT qp.*, t.test_code, tv.test_name
        FROM qc_parameters qp
        JOIN tests t ON qp.test_id = t.id
        LEFT JOIN test_versions tv ON t.id = tv.test_id AND tv.status = 'PUBLISHED'
        WHERE qp.id = ?
    `, [id]) || null;
}
function listQCParameters(options = {}) {
  const conditions = [];
  const params = [];
  if (options.testId) {
    conditions.push("qp.test_id = ?");
    params.push(options.testId);
  }
  if (options.activeOnly !== false) {
    conditions.push("qp.is_active = 1");
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return queryAll(`
        SELECT qp.*, t.test_code, tv.test_name
        FROM qc_parameters qp
        JOIN tests t ON qp.test_id = t.id
        LEFT JOIN test_versions tv ON t.id = tv.test_id AND tv.status = 'PUBLISHED'
        ${whereClause}
        ORDER BY t.test_code, qp.level
    `, params);
}
function recordQCEntry(data) {
  try {
    const param = getQCParameter(data.qcParameterId);
    if (!param) {
      return { success: false, error: "QC Parameter not found" };
    }
    const deviationSd = param.target_sd > 0 ? (data.observedValue - param.target_mean) / param.target_sd : 0;
    let status = "PASS";
    if (Math.abs(deviationSd) >= 3) {
      status = "FAIL";
    } else if (Math.abs(deviationSd) >= 2) {
      status = "WARNING";
    }
    const id = runWithId(`
            INSERT INTO qc_entries (qc_parameter_id, entry_date, observed_value, deviation_sd, status, remarks, entered_by, entered_at, acceptance_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), 'PENDING')
        `, [
      data.qcParameterId,
      data.entryDate,
      data.observedValue,
      deviationSd,
      status,
      data.remarks || null,
      data.enteredBy
    ]);
    logAudit({
      entity: ENTITIES.QC_ENTRY,
      entityId: id,
      action: ACTIONS.CREATE,
      newValue: { ...data, deviationSd, status },
      performedBy: data.enteredBy
    });
    return { success: true, entryId: id, status, deviationSd };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
function reviewQCEntry(entryId, acceptanceStatus, reviewedBy, remarks) {
  try {
    const entry = queryOne("SELECT * FROM qc_entries WHERE id = ?", [entryId]);
    if (!entry) {
      return { success: false, error: "QC Entry not found" };
    }
    run(`
            UPDATE qc_entries 
            SET acceptance_status = ?, reviewed_by = ?, reviewed_at = datetime('now'), remarks = COALESCE(?, remarks)
            WHERE id = ?
        `, [acceptanceStatus, reviewedBy, remarks, entryId]);
    logAudit({
      entity: ENTITIES.QC_ENTRY,
      entityId: entryId,
      action: ACTIONS.APPROVE,
      oldValue: { acceptance_status: entry.acceptance_status },
      newValue: { acceptance_status: acceptanceStatus, remarks },
      performedBy: reviewedBy
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
function getQCEntries(options = {}) {
  const conditions = [];
  const params = [];
  if (options.qcParameterId) {
    conditions.push("e.qc_parameter_id = ?");
    params.push(options.qcParameterId);
  }
  if (options.testId) {
    conditions.push("qp.test_id = ?");
    params.push(options.testId);
  }
  if (options.fromDate) {
    conditions.push("e.entry_date >= ?");
    params.push(options.fromDate);
  }
  if (options.toDate) {
    conditions.push("e.entry_date <= ?");
    params.push(options.toDate);
  }
  if (options.status) {
    conditions.push("e.status = ?");
    params.push(options.status);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limitClause = options.limit ? `LIMIT ${options.limit}` : "";
  return queryAll(`
        SELECT e.*, qp.parameter_name, qp.level, qp.target_mean, qp.target_sd, u.full_name as entered_by_name
        FROM qc_entries e
        JOIN qc_parameters qp ON e.qc_parameter_id = qp.id
        LEFT JOIN users u ON e.entered_by = u.id
        ${whereClause}
        ORDER BY e.entry_date DESC, e.entered_at DESC
        ${limitClause}
    `, params);
}
function getTodayQCStatus() {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const params = listQCParameters({ activeOnly: true });
  return params.map((param) => {
    const entries = getQCEntries({ qcParameterId: param.id, fromDate: today, toDate: today });
    return {
      parameter: param,
      entries,
      hasFailure: entries.some((e) => e.status === "FAIL"),
      hasWarning: entries.some((e) => e.status === "WARNING")
    };
  });
}
function getLeveyJenningsData(qcParameterId, count = 30) {
  const param = getQCParameter(qcParameterId);
  if (!param) return null;
  const entries = queryAll(`
        SELECT entry_date, observed_value, deviation_sd, status
        FROM qc_entries
        WHERE qc_parameter_id = ?
        ORDER BY entry_date DESC, entered_at DESC
        LIMIT ?
    `, [qcParameterId, count]);
  return {
    parameter: param,
    entries: entries.reverse().map((e) => ({
      date: e.entry_date,
      value: e.observed_value,
      deviation_sd: e.deviation_sd,
      status: e.status
    }))
  };
}
function listQCRules() {
  return queryAll("SELECT * FROM qc_rules ORDER BY rule_code");
}
function checkWestgardRules(qcParameterId) {
  const entries = getQCEntries({ qcParameterId, limit: 10 });
  const results = [];
  if (entries.length === 0) return results;
  const deviations = entries.map((e) => e.deviation_sd || 0);
  if (Math.abs(deviations[0]) >= 3) {
    results.push({
      rule: "1:3s",
      triggered: true,
      isRejection: true,
      message: `Latest value exceeds ±3SD (${deviations[0].toFixed(2)}SD)`
    });
  }
  if (Math.abs(deviations[0]) >= 2 && Math.abs(deviations[0]) < 3) {
    results.push({
      rule: "1:2s",
      triggered: true,
      isRejection: false,
      message: `Latest value exceeds ±2SD (${deviations[0].toFixed(2)}SD) - Warning`
    });
  }
  if (entries.length >= 2 && deviations[0] >= 2 && deviations[1] >= 2 || deviations[0] <= -2 && deviations[1] <= -2) {
    results.push({
      rule: "2:2s",
      triggered: true,
      isRejection: true,
      message: "Two consecutive values exceed same ±2SD limit"
    });
  }
  if (entries.length >= 2) {
    const range = Math.abs(deviations[0] - deviations[1]);
    if (range >= 4) {
      results.push({
        rule: "R:4s",
        triggered: true,
        isRejection: true,
        message: `Range between last two values exceeds 4SD (${range.toFixed(2)}SD)`
      });
    }
  }
  if (entries.length >= 10) {
    const allPositive = deviations.slice(0, 10).every((d) => d > 0);
    const allNegative = deviations.slice(0, 10).every((d) => d < 0);
    if (allPositive || allNegative) {
      results.push({
        rule: "10x",
        triggered: true,
        isRejection: true,
        message: "Last 10 values all on same side of mean (systematic shift)"
      });
    }
  }
  return results;
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
  TEST_DELETE: "test:delete",
  // Test Wizard
  TEST_WIZARD_GET_DRAFTS: "testWizard:getDrafts",
  TEST_WIZARD_CREATE_DRAFT: "testWizard:createDraft",
  TEST_WIZARD_UPDATE_DRAFT: "testWizard:updateDraft",
  TEST_WIZARD_UPDATE_STEP: "testWizard:updateStep",
  TEST_WIZARD_SAVE_PARAMS: "testWizard:saveParams",
  TEST_WIZARD_PUBLISH: "testWizard:publish",
  TEST_WIZARD_CREATE_DRAFT_FROM_EXISTING: "testWizard:createDraftFromExisting",
  TEST_WIZARD_GET_DRAFT: "testWizard:getDraft",
  // To load draft details
  // Parameters
  PARAMETER_LIST: "parameter:list",
  // Reference Ranges
  REF_RANGE_LIST: "refRange:list",
  REF_RANGE_CREATE: "refRange:create",
  REF_RANGE_UPDATE: "refRange:update",
  REF_RANGE_DELETE: "refRange:delete",
  // Results
  RESULT_PENDING_SAMPLES: "result:pendingSamples",
  RESULT_GET: "result:get",
  RESULT_SAVE: "result:save",
  RESULT_SUBMIT: "result:submit",
  RESULT_VERIFY: "result:verify",
  RESULT_FINALIZE: "result:finalize",
  RESULT_GET_PREVIOUS: "result:getPrevious",
  // Users (Admin)
  USER_LIST: "user:list",
  USER_CREATE: "user:create",
  USER_UPDATE: "user:update",
  USER_TOGGLE_ACTIVE: "user:toggleActive",
  ROLE_LIST: "role:list",
  // Reports
  REPORT_GET_DATA: "report:getData",
  // Lab Settings
  LAB_SETTINGS_GET: "labSettings:get",
  LAB_SETTINGS_UPDATE: "labSettings:update",
  // Doctors
  DOCTOR_LIST: "doctor:list",
  DOCTOR_LIST_ALL: "doctor:listAll",
  DOCTOR_GET: "doctor:get",
  DOCTOR_CREATE: "doctor:create",
  DOCTOR_UPDATE: "doctor:update",
  DOCTOR_TOGGLE_ACTIVE: "doctor:toggleActive",
  DOCTOR_SEARCH: "doctor:search",
  // Price Lists
  PRICE_LIST_LIST: "priceList:list",
  PRICE_LIST_LIST_ALL: "priceList:listAll",
  PRICE_LIST_GET: "priceList:get",
  PRICE_LIST_GET_DEFAULT: "priceList:getDefault",
  PRICE_LIST_CREATE: "priceList:create",
  PRICE_LIST_UPDATE: "priceList:update",
  PRICE_LIST_DELETE: "priceList:delete",
  // Test Prices
  TEST_PRICE_LIST: "testPrice:list",
  TEST_PRICE_GET: "testPrice:get",
  TEST_PRICE_SET: "testPrice:set",
  TEST_PRICE_BULK_SET: "testPrice:bulkSet",
  TEST_PRICE_GET_FOR_TESTS: "testPrice:getForTests",
  // Packages
  PACKAGE_LIST: "package:list",
  PACKAGE_GET: "package:get",
  PACKAGE_CREATE: "package:create",
  PACKAGE_UPDATE: "package:update",
  // Invoices
  INVOICE_LIST: "invoice:list",
  INVOICE_GET: "invoice:get",
  INVOICE_GET_BY_ORDER: "invoice:getByOrder",
  INVOICE_CREATE: "invoice:create",
  INVOICE_FINALIZE: "invoice:finalize",
  INVOICE_CANCEL: "invoice:cancel",
  INVOICE_PATIENT_DUES: "invoice:patientDues",
  INVOICE_SUMMARY: "invoice:summary",
  // Payments
  PAYMENT_RECORD: "payment:record",
  PAYMENT_LIST: "payment:list",
  PAYMENT_GET: "payment:get",
  PAYMENT_PATIENT_HISTORY: "payment:patientHistory",
  PAYMENT_DAILY_COLLECTION: "payment:dailyCollection",
  PAYMENT_OUTSTANDING_DUES: "payment:outstandingDues",
  // Commissions
  COMMISSION_GET_DOCTOR_COMMISSIONS: "commission:getDoctorCommissions",
  COMMISSION_GET_MONTHLY_SUMMARY: "commission:getMonthlySummary",
  COMMISSION_GET_STATEMENT: "commission:getStatement",
  COMMISSION_GET_DOCTORS_WITH_PENDING: "commission:getDoctorsWithPending",
  COMMISSION_CREATE_SETTLEMENT: "commission:createSettlement",
  COMMISSION_RECORD_PAYMENT: "commission:recordPayment",
  COMMISSION_GET_SETTLEMENT: "commission:getSettlement",
  COMMISSION_LIST_SETTLEMENTS: "commission:listSettlements",
  // QC (Quality Control)
  QC_PARAMETER_LIST: "qc:parameterList",
  QC_PARAMETER_GET: "qc:parameterGet",
  QC_PARAMETER_CREATE: "qc:parameterCreate",
  QC_PARAMETER_UPDATE: "qc:parameterUpdate",
  QC_ENTRY_RECORD: "qc:entryRecord",
  QC_ENTRY_REVIEW: "qc:entryReview",
  QC_ENTRY_LIST: "qc:entryList",
  QC_TODAY_STATUS: "qc:todayStatus",
  QC_LEVEY_JENNINGS: "qc:leveyJennings",
  QC_RULES_LIST: "qc:rulesList",
  QC_WESTGARD_CHECK: "qc:westgardCheck",
  // Audit
  AUDIT_LOG: "audit:log",
  AUDIT_GET_LOGS: "audit:getLogs",
  AUDIT_ENTITY_HISTORY: "audit:entityHistory",
  AUDIT_RECENT_ACTIVITY: "audit:recentActivity",
  AUDIT_STATS: "audit:stats"
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
  ipcMain.handle(IPC_CHANNELS.TEST_DELETE, (_, testId) => {
    return deleteTest(testId);
  });
  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_GET_DRAFTS, () => {
    return getDrafts();
  });
  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_CREATE_DRAFT, (_, data) => {
    return createTestDraft(data);
  });
  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_UPDATE_DRAFT, (_, id, data) => {
    return updateTestDraft(id, data);
  });
  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_UPDATE_STEP, (_, id, step) => {
    return updateWizardStep(id, step);
  });
  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_SAVE_PARAMS, (_, id, params) => {
    return saveTestParameters(id, params);
  });
  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_PUBLISH, (_, id) => {
    return publishTest(id);
  });
  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_CREATE_DRAFT_FROM_EXISTING, (_, testId) => {
    return createDraftFromExisting(testId);
  });
  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_GET_DRAFT, (_, versionId) => {
    getTest(versionId);
    return getTestVersion(versionId);
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
  ipcMain.handle(IPC_CHANNELS.USER_LIST, () => {
    return listUsers();
  });
  ipcMain.handle(IPC_CHANNELS.USER_CREATE, (_, data) => {
    return createUser(data);
  });
  ipcMain.handle(IPC_CHANNELS.USER_UPDATE, (_, id, data) => {
    return updateUser(id, data);
  });
  ipcMain.handle(IPC_CHANNELS.USER_TOGGLE_ACTIVE, (_, id) => {
    return toggleUserActive(id);
  });
  ipcMain.handle(IPC_CHANNELS.ROLE_LIST, () => {
    return listRoles();
  });
  ipcMain.handle(IPC_CHANNELS.RESULT_PENDING_SAMPLES, () => {
    return listPendingSamples();
  });
  ipcMain.handle(IPC_CHANNELS.RESULT_GET, (_, sampleId) => {
    return getSampleResults(sampleId);
  });
  ipcMain.handle(IPC_CHANNELS.RESULT_SAVE, (_, data) => {
    return saveResultValues(data);
  });
  ipcMain.handle(IPC_CHANNELS.RESULT_SUBMIT, (_, sampleId) => {
    return submitResults(sampleId);
  });
  ipcMain.handle(IPC_CHANNELS.RESULT_VERIFY, (_, sampleId, verifiedBy) => {
    return verifyResults(sampleId, verifiedBy);
  });
  ipcMain.handle(IPC_CHANNELS.RESULT_FINALIZE, (_, sampleId) => {
    return finalizeResults(sampleId);
  });
  ipcMain.handle(IPC_CHANNELS.RESULT_GET_PREVIOUS, (_, patientId, testId, currentSampleId) => {
    return getPreviousResults(patientId, testId, currentSampleId);
  });
  ipcMain.handle(IPC_CHANNELS.REPORT_GET_DATA, (_, sampleId) => {
    return getReportData(sampleId);
  });
  ipcMain.handle(IPC_CHANNELS.LAB_SETTINGS_GET, () => {
    return getLabSettings();
  });
  ipcMain.handle(IPC_CHANNELS.LAB_SETTINGS_UPDATE, (_, key, value) => {
    updateLabSetting(key, value);
    return { success: true };
  });
  ipcMain.handle(IPC_CHANNELS.DOCTOR_LIST, () => {
    return listDoctors();
  });
  ipcMain.handle(IPC_CHANNELS.DOCTOR_LIST_ALL, () => {
    return listAllDoctors();
  });
  ipcMain.handle(IPC_CHANNELS.DOCTOR_GET, (_, id) => {
    return getDoctor(id);
  });
  ipcMain.handle(IPC_CHANNELS.DOCTOR_CREATE, (_, data) => {
    return createDoctor(data);
  });
  ipcMain.handle(IPC_CHANNELS.DOCTOR_UPDATE, (_, id, data) => {
    return updateDoctor(id, data);
  });
  ipcMain.handle(IPC_CHANNELS.DOCTOR_TOGGLE_ACTIVE, (_, id) => {
    return toggleDoctorActive(id);
  });
  ipcMain.handle(IPC_CHANNELS.DOCTOR_SEARCH, (_, query) => {
    return searchDoctors(query);
  });
  ipcMain.handle(IPC_CHANNELS.PRICE_LIST_LIST, () => {
    return listPriceLists();
  });
  ipcMain.handle(IPC_CHANNELS.PRICE_LIST_LIST_ALL, () => {
    return listAllPriceLists();
  });
  ipcMain.handle(IPC_CHANNELS.PRICE_LIST_GET, (_, id) => {
    return getPriceList(id);
  });
  ipcMain.handle(IPC_CHANNELS.PRICE_LIST_GET_DEFAULT, () => {
    return getDefaultPriceList();
  });
  ipcMain.handle(IPC_CHANNELS.PRICE_LIST_CREATE, (_, data) => {
    return createPriceList(data);
  });
  ipcMain.handle(IPC_CHANNELS.PRICE_LIST_UPDATE, (_, id, data) => {
    return updatePriceList(id, data);
  });
  ipcMain.handle(IPC_CHANNELS.PRICE_LIST_DELETE, (_, id) => {
    return deletePriceList(id);
  });
  ipcMain.handle(IPC_CHANNELS.TEST_PRICE_LIST, (_, priceListId) => {
    return listTestPrices(priceListId);
  });
  ipcMain.handle(IPC_CHANNELS.TEST_PRICE_GET, (_, testId, priceListId) => {
    return getTestPrice(testId, priceListId);
  });
  ipcMain.handle(IPC_CHANNELS.TEST_PRICE_SET, (_, priceListId, testId, data) => {
    return setTestPrice(priceListId, testId, data);
  });
  ipcMain.handle(IPC_CHANNELS.TEST_PRICE_BULK_SET, (_, priceListId, prices) => {
    return bulkSetTestPrices(priceListId, prices);
  });
  ipcMain.handle(IPC_CHANNELS.TEST_PRICE_GET_FOR_TESTS, (_, testIds, priceListId) => {
    const priceMap = getTestPricesForTests(testIds, priceListId);
    return Object.fromEntries(priceMap);
  });
  ipcMain.handle(IPC_CHANNELS.PACKAGE_LIST, (_, priceListId) => {
    return listPackages(priceListId);
  });
  ipcMain.handle(IPC_CHANNELS.PACKAGE_GET, (_, id) => {
    return getPackage(id);
  });
  ipcMain.handle(IPC_CHANNELS.PACKAGE_CREATE, (_, data) => {
    return createPackage(data);
  });
  ipcMain.handle(IPC_CHANNELS.PACKAGE_UPDATE, (_, id, data) => {
    return updatePackage(id, data);
  });
  ipcMain.handle(IPC_CHANNELS.INVOICE_LIST, (_, options) => {
    return listInvoices(options);
  });
  ipcMain.handle(IPC_CHANNELS.INVOICE_GET, (_, id) => {
    return getInvoice(id);
  });
  ipcMain.handle(IPC_CHANNELS.INVOICE_GET_BY_ORDER, (_, orderId) => {
    return getInvoiceByOrder(orderId);
  });
  ipcMain.handle(IPC_CHANNELS.INVOICE_CREATE, (_, data) => {
    return createInvoice(data);
  });
  ipcMain.handle(IPC_CHANNELS.INVOICE_FINALIZE, (_, id, userId) => {
    return finalizeInvoice(id, userId);
  });
  ipcMain.handle(IPC_CHANNELS.INVOICE_CANCEL, (_, id, reason, userId) => {
    return cancelInvoice(id, reason, userId);
  });
  ipcMain.handle(IPC_CHANNELS.INVOICE_PATIENT_DUES, (_, patientId) => {
    return getPatientDues(patientId);
  });
  ipcMain.handle(IPC_CHANNELS.INVOICE_SUMMARY, (_, fromDate, toDate) => {
    return getInvoiceSummary(fromDate, toDate);
  });
  ipcMain.handle(IPC_CHANNELS.PAYMENT_RECORD, (_, data) => {
    return recordPayment(data);
  });
  ipcMain.handle(IPC_CHANNELS.PAYMENT_LIST, (_, invoiceId) => {
    return listPayments(invoiceId);
  });
  ipcMain.handle(IPC_CHANNELS.PAYMENT_GET, (_, id) => {
    return getPayment(id);
  });
  ipcMain.handle(IPC_CHANNELS.PAYMENT_PATIENT_HISTORY, (_, patientId) => {
    return getPatientPaymentHistory(patientId);
  });
  ipcMain.handle(IPC_CHANNELS.PAYMENT_DAILY_COLLECTION, (_, date) => {
    return getDailyCollection(date);
  });
  ipcMain.handle(IPC_CHANNELS.PAYMENT_OUTSTANDING_DUES, () => {
    return getOutstandingDues();
  });
  ipcMain.handle(IPC_CHANNELS.COMMISSION_GET_DOCTOR_COMMISSIONS, (_, doctorId, month, year) => {
    return getDoctorCommissions(doctorId, month, year);
  });
  ipcMain.handle(IPC_CHANNELS.COMMISSION_GET_MONTHLY_SUMMARY, (_, doctorId, month, year) => {
    return getMonthlyCommissionSummary(doctorId, month, year);
  });
  ipcMain.handle(IPC_CHANNELS.COMMISSION_GET_STATEMENT, (_, doctorId, month, year) => {
    return getCommissionStatement(doctorId, month, year);
  });
  ipcMain.handle(IPC_CHANNELS.COMMISSION_GET_DOCTORS_WITH_PENDING, (_, month, year) => {
    return getDoctorsWithPendingCommissions(month, year);
  });
  ipcMain.handle(IPC_CHANNELS.COMMISSION_CREATE_SETTLEMENT, (_, doctorId, month, year, userId) => {
    return getOrCreateSettlement(doctorId, month, year, userId);
  });
  ipcMain.handle(IPC_CHANNELS.COMMISSION_RECORD_PAYMENT, (_, settlementId, amount, paymentMode, paymentReference, remarks, userId) => {
    return recordSettlementPayment(settlementId, amount, paymentMode, paymentReference, remarks, userId);
  });
  ipcMain.handle(IPC_CHANNELS.COMMISSION_GET_SETTLEMENT, (_, settlementId) => {
    return getSettlement(settlementId);
  });
  ipcMain.handle(IPC_CHANNELS.COMMISSION_LIST_SETTLEMENTS, (_, options) => {
    return listSettlements(options);
  });
  ipcMain.handle(IPC_CHANNELS.QC_PARAMETER_LIST, (_, options) => {
    return listQCParameters(options);
  });
  ipcMain.handle(IPC_CHANNELS.QC_PARAMETER_GET, (_, id) => {
    return getQCParameter(id);
  });
  ipcMain.handle(IPC_CHANNELS.QC_PARAMETER_CREATE, (_, data) => {
    return createQCParameter(data);
  });
  ipcMain.handle(IPC_CHANNELS.QC_PARAMETER_UPDATE, (_, id, data, userId) => {
    return updateQCParameter(id, data, userId);
  });
  ipcMain.handle(IPC_CHANNELS.QC_ENTRY_RECORD, (_, data) => {
    return recordQCEntry(data);
  });
  ipcMain.handle(IPC_CHANNELS.QC_ENTRY_REVIEW, (_, entryId, acceptanceStatus, reviewedBy, remarks) => {
    return reviewQCEntry(entryId, acceptanceStatus, reviewedBy, remarks);
  });
  ipcMain.handle(IPC_CHANNELS.QC_ENTRY_LIST, (_, options) => {
    return getQCEntries(options);
  });
  ipcMain.handle(IPC_CHANNELS.QC_TODAY_STATUS, () => {
    return getTodayQCStatus();
  });
  ipcMain.handle(IPC_CHANNELS.QC_LEVEY_JENNINGS, (_, qcParameterId, count) => {
    return getLeveyJenningsData(qcParameterId, count);
  });
  ipcMain.handle(IPC_CHANNELS.QC_RULES_LIST, () => {
    return listQCRules();
  });
  ipcMain.handle(IPC_CHANNELS.QC_WESTGARD_CHECK, (_, qcParameterId) => {
    return checkWestgardRules(qcParameterId);
  });
  ipcMain.handle(IPC_CHANNELS.AUDIT_LOG, (_, input) => {
    return { success: true, id: logAudit(input) };
  });
  ipcMain.handle(IPC_CHANNELS.AUDIT_GET_LOGS, (_, options) => {
    return getAuditLogs(options);
  });
  ipcMain.handle(IPC_CHANNELS.AUDIT_ENTITY_HISTORY, (_, entity, entityId) => {
    return getEntityHistory(entity, entityId);
  });
  ipcMain.handle(IPC_CHANNELS.AUDIT_RECENT_ACTIVITY, (_, limit) => {
    return getRecentActivity(limit);
  });
  ipcMain.handle(IPC_CHANNELS.AUDIT_STATS, (_, fromDate, toDate) => {
    return getActivityStats(fromDate, toDate);
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
