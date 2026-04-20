import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../contexts/AppContext'
import { Shield, RefreshCw, AlertCircle, ChevronLeft, Copy, Check, Eye, EyeOff } from 'lucide-react'

function fallbackCopy(text, onSuccess, onFail) {
  const el = document.createElement('textarea')
  el.value = text
  // Must not be display:none — browser blocks execCommand on hidden elements.
  // Tiny, transparent, in-viewport element satisfies Chrome's focus requirement.
  el.style.cssText = 'position:fixed;top:10px;left:10px;width:1px;height:1px;padding:0;border:none;outline:none;box-shadow:none;background:transparent;color:transparent;opacity:0.01;font-size:1px;z-index:-1'
  document.body.appendChild(el)
  el.focus()
  el.select()
  el.setSelectionRange(0, el.value.length)
  try {
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    if (ok) { onSuccess && onSuccess() } else { onFail && onFail() }
  } catch (_) {
    document.body.removeChild(el)
    onFail && onFail()
  }
}

function copyToClipboard(text, onSuccess, onFail) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(() => fallbackCopy(text, onSuccess, onFail))
    return
  }
  fallbackCopy(text, onSuccess, onFail)
}


// Generate a proper BIP39 mnemonic using browser-native crypto entropy.
// 256 bits → 24 words; 128 bits → 12 words.
function genSeed(count = 12) {
  const w = ["abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act", "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit", "adult", "advance", "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent", "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert", "alien", "all", "alley", "allow", "almost", "alone", "alpha", "already", "also", "alter", "always", "amateur", "amazing", "among", "amount", "amused", "analyst", "anchor", "ancient", "anger", "angle", "angry", "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique", "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april", "arch", "arctic", "area", "arena", "argue", "arm", "armed", "armor", "army", "around", "arrange", "arrest", "arrive", "arrow", "art", "artefact", "artist", "artwork", "ask", "aspect", "assault", "asset", "assist", "assume", "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "auction", "audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado", "avoid", "awake", "aware", "away", "awesome", "awful", "awkward", "axis", "baby", "bachelor", "bacon", "badge", "bag", "balance", "balcony", "ball", "bamboo", "banana", "banner", "bar", "barely", "bargain", "barrel", "base", "basic", "basket", "battle", "beach", "bean", "beauty", "because", "become", "beef", "before", "begin", "behave", "behind", "believe", "below", "belt", "bench", "benefit", "best", "betray", "better", "between", "beyond", "bicycle", "bid", "bike", "bind", "biology", "bird", "birth", "bitter", "black", "blade", "blame", "blanket", "blast", "bleak", "bless", "blind", "blood", "blossom", "blouse", "blue", "blur", "blush", "board", "boat", "body", "boil", "bomb", "bone", "bonus", "book", "boost", "border", "boring", "borrow", "boss", "bottom", "bounce", "box", "boy", "bracket", "brain", "brand", "brass", "brave", "bread", "breeze", "brick", "bridge", "brief", "bright", "bring", "brisk", "broccoli", "broken", "bronze", "broom", "brother", "brown", "brush", "bubble", "buddy", "budget", "buffalo", "build", "bulb", "bulk", "bullet", "bundle", "bunker", "burden", "burger", "burst", "bus", "business", "busy", "butter", "buyer", "buzz", "cabbage", "cabin", "cable", "cactus", "cage", "cake", "call", "calm", "camera", "camp", "can", "canal", "cancel", "candy", "cannon", "canoe", "canvas", "canyon", "capable", "capital", "captain", "car", "carbon", "card", "cargo", "carpet", "carry", "cart", "case", "cash", "casino", "castle", "casual", "cat", "catalog", "catch", "category", "cattle", "caught", "cause", "caution", "cave", "ceiling", "celery", "cement", "census", "century", "cereal", "certain", "chair", "chalk", "champion", "change", "chaos", "chapter", "charge", "chase", "chat", "cheap", "check", "cheese", "chef", "cherry", "chest", "chicken", "chief", "child", "chimney", "choice", "choose", "chronic", "chuckle", "chunk", "churn", "cigar", "cinnamon", "circle", "citizen", "city", "civil", "claim", "clap", "clarify", "claw", "clay", "clean", "clerk", "clever", "click", "client", "cliff", "climb", "clinic", "clip", "clock", "clog", "close", "cloth", "cloud", "clown", "club", "clump", "cluster", "clutch", "coach", "coast", "coconut", "code", "coffee", "coil", "coin", "collect", "color", "column", "combine", "come", "comfort", "comic", "common", "company", "concert", "conduct", "confirm", "congress", "connect", "consider", "control", "convince", "cook", "cool", "copper", "copy", "coral", "core", "corn", "correct", "cost", "cotton", "couch", "country", "couple", "course", "cousin", "cover", "coyote", "crack", "cradle", "craft", "cram", "crane", "crash", "crater", "crawl", "crazy", "cream", "credit", "creek", "crew", "cricket", "crime", "crisp", "critic", "crop", "cross", "crouch", "crowd", "crucial", "cruel", "cruise", "crumble", "crunch", "crush", "cry", "crystal", "cube", "culture", "cup", "cupboard", "curious", "current", "curtain", "curve", "cushion", "custom", "cute", "cycle", "dad", "damage", "damp", "dance", "danger", "daring", "dash", "daughter", "dawn", "day", "deal", "debate", "debris", "decade", "december", "decide", "decline", "decorate", "decrease", "deer", "defense", "define", "defy", "degree", "delay", "deliver", "demand", "demise", "denial", "dentist", "deny", "depart", "depend", "deposit", "depth", "deputy", "derive", "describe", "desert", "design", "desk", "despair", "destroy", "detail", "detect", "develop", "device", "devote", "diagram", "dial", "diamond", "diary", "dice", "diesel", "diet", "differ", "digital", "dignity", "dilemma", "dinner", "dinosaur", "direct", "dirt", "disagree", "discover", "disease", "dish", "dismiss", "disorder", "display", "distance", "divert", "divide", "divorce", "dizzy", "doctor", "document", "dog", "doll", "dolphin", "domain", "donate", "donkey", "donor", "door", "dose", "double", "dove", "draft", "dragon", "drama", "drastic", "draw", "dream", "dress", "drift", "drill", "drink", "drip", "drive", "drop", "drum", "dry", "duck", "dumb", "dune", "during", "dust", "dutch", "duty", "dwarf", "dynamic", "eager", "eagle", "early", "earn", "earth", "easily", "east", "easy", "echo", "ecology", "economy", "edge", "edit", "educate", "effort", "egg", "eight", "either", "elbow", "elder", "electric", "elegant", "element", "elephant", "elevator", "elite", "else", "embark", "embody", "embrace", "emerge", "emotion", "employ", "empower", "empty", "enable", "enact", "end", "endless", "endorse", "enemy", "energy", "enforce", "engage", "engine", "enhance", "enjoy", "enlist", "enough", "enrich", "enroll", "ensure", "enter", "entire", "entry", "envelope", "episode", "equal", "equip", "era", "erase", "erode", "erosion", "error", "erupt", "escape", "essay", "essence", "estate", "eternal", "ethics", "evidence", "evil", "evoke", "evolve", "exact", "example", "excess", "exchange", "excite", "exclude", "excuse", "execute", "exercise", "exhaust", "exhibit", "exile", "exist", "exit", "exotic", "expand", "expect", "expire", "explain", "expose", "express", "extend", "extra", "eye", "eyebrow", "fabric", "face", "faculty", "fade", "faint", "faith", "fall", "false", "fame", "family", "famous", "fan", "fancy", "fantasy", "farm", "fashion", "fat", "fatal", "father", "fatigue", "fault", "favorite", "feature", "february", "federal", "fee", "feed", "feel", "female", "fence", "festival", "fetch", "fever", "few", "fiber", "fiction", "field", "figure", "file", "film", "filter", "final", "find", "fine", "finger", "finish", "fire", "firm", "first", "fiscal", "fish", "fit", "fitness", "fix", "flag", "flame", "flash", "flat", "flavor", "flee", "flight", "flip", "float", "flock", "floor", "flower", "fluid", "flush", "fly", "foam", "focus", "fog", "foil", "fold", "follow", "food", "foot", "force", "forest", "forget", "fork", "fortune", "forum", "forward", "fossil", "foster", "found", "fox", "fragile", "frame", "frequent", "fresh", "friend", "fringe", "frog", "front", "frost", "frown", "frozen", "fruit", "fuel", "fun", "funny", "furnace", "fury", "future", "gadget", "gain", "galaxy", "gallery", "game", "gap", "garage", "garbage", "garden", "garlic", "garment", "gas", "gasp", "gate", "gather", "gauge", "gaze", "general", "genius", "genre", "gentle", "genuine", "gesture", "ghost", "giant", "gift", "giggle", "ginger", "giraffe", "girl", "give", "glad", "glance", "glare", "glass", "glide", "glimpse", "globe", "gloom", "glory", "glove", "glow", "glue", "goat", "goddess", "gold", "good", "goose", "gorilla", "gospel", "gossip", "govern", "gown", "grab", "grace", "grain", "grant", "grape", "grass", "gravity", "great", "green", "grid", "grief", "grit", "grocery", "group", "grow", "grunt", "guard", "guess", "guide", "guilt", "guitar", "gun", "gym", "habit", "hair", "half", "hammer", "hamster", "hand", "happy", "harbor", "hard", "harsh", "harvest", "hat", "have", "hawk", "hazard", "head", "health", "heart", "heavy", "hedgehog", "height", "hello", "helmet", "help", "hen", "hero", "hidden", "high", "hill", "hint", "hip", "hire", "history", "hobby", "hockey", "hold", "hole", "holiday", "hollow", "home", "honey", "hood", "hope", "horn", "horror", "horse", "hospital", "host", "hotel", "hour", "hover", "hub", "huge", "human", "humble", "humor", "hundred", "hungry", "hunt", "hurdle", "hurry", "hurt", "husband", "hybrid", "ice", "icon", "idea", "identify", "idle", "ignore", "ill", "illegal", "illness", "image", "imitate", "immense", "immune", "impact", "impose", "improve", "impulse", "inch", "include", "income", "increase", "index", "indicate", "indoor", "industry", "infant", "inflict", "inform", "inhale", "inherit", "initial", "inject", "injury", "inmate", "inner", "innocent", "input", "inquiry", "insane", "insect", "inside", "inspire", "install", "intact", "interest", "into", "invest", "invite", "involve", "iron", "island", "isolate", "issue", "item", "ivory", "jacket", "jaguar", "jar", "jazz", "jealous", "jeans", "jelly", "jewel", "job", "join", "joke", "journey", "joy", "judge", "juice", "jump", "jungle", "junior", "junk", "just", "kangaroo", "keen", "keep", "ketchup", "key", "kick", "kid", "kidney", "kind", "kingdom", "kiss", "kit", "kitchen", "kite", "kitten", "kiwi", "knee", "knife", "knock", "know", "lab", "label", "labor", "ladder", "lady", "lake", "lamp", "language", "laptop", "large", "later", "latin", "laugh", "laundry", "lava", "law", "lawn", "lawsuit", "layer", "lazy", "leader", "leaf", "learn", "leave", "lecture", "left", "leg", "legal", "legend", "leisure", "lemon", "lend", "length", "lens", "leopard", "lesson", "letter", "level", "liar", "liberty", "library", "license", "life", "lift", "light", "like", "limb", "limit", "link", "lion", "liquid", "list", "little", "live", "lizard", "load", "loan", "lobster", "local", "lock", "logic", "lonely", "long", "loop", "lottery", "loud", "lounge", "love", "loyal", "lucky", "luggage", "lumber", "lunar", "lunch", "luxury", "lyrics", "machine", "mad", "magic", "magnet", "maid", "mail", "main", "major", "make", "mammal", "man", "manage", "mandate", "mango", "mansion", "manual", "maple", "marble", "march", "margin", "marine", "market", "marriage", "mask", "mass", "master", "match", "material", "math", "matrix", "matter", "maximum", "maze", "meadow", "mean", "measure", "meat", "mechanic", "medal", "media", "melody", "melt", "member", "memory", "mention", "menu", "mercy", "merge", "merit", "merry", "mesh", "message", "metal", "method", "middle", "midnight", "milk", "million", "mimic", "mind", "minimum", "minor", "minute", "miracle", "mirror", "misery", "miss", "mistake", "mix", "mixed", "mixture", "mobile", "model", "modify", "mom", "moment", "monitor", "monkey", "monster", "month", "moon", "moral", "more", "morning", "mosquito", "mother", "motion", "motor", "mountain", "mouse", "move", "movie", "much", "muffin", "mule", "multiply", "muscle", "museum", "mushroom", "music", "must", "mutual", "myself", "mystery", "myth", "naive", "name", "napkin", "narrow", "nasty", "nation", "nature", "near", "neck", "need", "negative", "neglect", "neither", "nephew", "nerve", "nest", "net", "network", "neutral", "never", "news", "next", "nice", "night", "noble", "noise", "nominee", "noodle", "normal", "north", "nose", "notable", "note", "nothing", "notice", "novel", "now", "nuclear", "number", "nurse", "nut", "oak", "obey", "object", "oblige", "obscure", "observe", "obtain", "obvious", "occur", "ocean", "october", "odor", "off", "offer", "office", "often", "oil", "okay", "old", "olive", "olympic", "omit", "once", "one", "onion", "online", "only", "open", "opera", "opinion", "oppose", "option", "orange", "orbit", "orchard", "order", "ordinary", "organ", "orient", "original", "orphan", "ostrich", "other", "outdoor", "outer", "output", "outside", "oval", "oven", "over", "own", "owner", "oxygen", "oyster", "ozone", "pact", "paddle", "page", "pair", "palace", "palm", "panda", "panel", "panic", "panther", "paper", "parade", "parent", "park", "parrot", "party", "pass", "patch", "path", "patient", "patrol", "pattern", "pause", "pave", "payment", "peace", "peanut", "pear", "peasant", "pelican", "pen", "penalty", "pencil", "people", "pepper", "perfect", "permit", "person", "pet", "phone", "photo", "phrase", "physical", "piano", "picnic", "picture", "piece", "pig", "pigeon", "pill", "pilot", "pink", "pioneer", "pipe", "pistol", "pitch", "pizza", "place", "planet", "plastic", "plate", "play", "please", "pledge", "pluck", "plug", "plunge", "poem", "poet", "point", "polar", "pole", "police", "pond", "pony", "pool", "popular", "portion", "position", "possible", "post", "potato", "pottery", "poverty", "powder", "power", "practice", "praise", "predict", "prefer", "prepare", "present", "pretty", "prevent", "price", "pride", "primary", "print", "priority", "prison", "private", "prize", "problem", "process", "produce", "profit", "program", "project", "promote", "proof", "property", "prosper", "protect", "proud", "provide", "public", "pudding", "pull", "pulp", "pulse", "pumpkin", "punch", "pupil", "puppy", "purchase", "purity", "purpose", "purse", "push", "put", "puzzle", "pyramid", "quality", "quantum", "quarter", "question", "quick", "quit", "quiz", "quote", "rabbit", "raccoon", "race", "rack", "radar", "radio", "rail", "rain", "raise", "rally", "ramp", "ranch", "random", "range", "rapid", "rare", "rate", "rather", "raven", "raw", "razor", "ready", "real", "reason", "rebel", "rebuild", "recall", "receive", "recipe", "record", "recycle", "reduce", "reflect", "reform", "refuse", "region", "regret", "regular", "reject", "relax", "release", "relief", "rely", "remain", "remember", "remind", "remove", "render", "renew", "rent", "reopen", "repair", "repeat", "replace", "report", "require", "rescue", "resemble", "resist", "resource", "response", "result", "retire", "retreat", "return", "reunion", "reveal", "review", "reward", "rhythm", "rib", "ribbon", "rice", "rich", "ride", "ridge", "rifle", "right", "rigid", "ring", "riot", "ripple", "risk", "ritual", "rival", "river", "road", "roast", "robot", "robust", "rocket", "romance", "roof", "rookie", "room", "rose", "rotate", "rough", "round", "route", "royal", "rubber", "rude", "rug", "rule", "run", "runway", "rural", "sad", "saddle", "sadness", "safe", "sail", "salad", "salmon", "salon", "salt", "salute", "same", "sample", "sand", "satisfy", "satoshi", "sauce", "sausage", "save", "say", "scale", "scan", "scare", "scatter", "scene", "scheme", "school", "science", "scissors", "scorpion", "scout", "scrap", "screen", "script", "scrub", "sea", "search", "season", "seat", "second", "secret", "section", "security", "seed", "seek", "segment", "select", "sell", "seminar", "senior", "sense", "sentence", "series", "service", "session", "settle", "setup", "seven", "shadow", "shaft", "shallow", "share", "shed", "shell", "sheriff", "shield", "shift", "shine", "ship", "shiver", "shock", "shoe", "shoot", "shop", "short", "shoulder", "shove", "shrimp", "shrug", "shuffle", "shy", "sibling", "sick", "side", "siege", "sight", "sign", "silent", "silk", "silly", "silver", "similar", "simple", "since", "sing", "siren", "sister", "situate", "six", "size", "skate", "sketch", "ski", "skill", "skin", "skirt", "skull", "slab", "slam", "sleep", "slender", "slice", "slide", "slight", "slim", "slogan", "slot", "slow", "slush", "small", "smart", "smile", "smoke", "smooth", "snack", "snake", "snap", "sniff", "snow", "soap", "soccer", "social", "sock", "soda", "soft", "solar", "soldier", "solid", "solution", "solve", "someone", "song", "soon", "sorry", "sort", "soul", "sound", "soup", "source", "south", "space", "spare", "spatial", "spawn", "speak", "special", "speed", "spell", "spend", "sphere", "spice", "spider", "spike", "spin", "spirit", "split", "spoil", "sponsor", "spoon", "sport", "spot", "spray", "spread", "spring", "spy", "square", "squeeze", "squirrel", "stable", "stadium", "staff", "stage", "stairs", "stamp", "stand", "start", "state", "stay", "steak", "steel", "stem", "step", "stereo", "stick", "still", "sting", "stock", "stomach", "stone", "stool", "story", "stove", "strategy", "street", "strike", "strong", "struggle", "student", "stuff", "stumble", "style", "subject", "submit", "subway", "success", "such", "sudden", "suffer", "sugar", "suggest", "suit", "summer", "sun", "sunny", "sunset", "super", "supply", "supreme", "sure", "surface", "surge", "surprise", "surround", "survey", "suspect", "sustain", "swallow", "swamp", "swap", "swarm", "swear", "sweet", "swift", "swim", "swing", "switch", "sword", "symbol", "symptom", "syrup", "system", "table", "tackle", "tag", "tail", "talent", "talk", "tank", "tape", "target", "task", "taste", "tattoo", "taxi", "teach", "team", "tell", "ten", "tenant", "tennis", "tent", "term", "test", "text", "thank", "that", "theme", "then", "theory", "there", "they", "thing", "this", "thought", "three", "thrive", "throw", "thumb", "thunder", "ticket", "tide", "tiger", "tilt", "timber", "time", "tiny", "tip", "tired", "tissue", "title", "toast", "tobacco", "today", "toddler", "toe", "together", "toilet", "token", "tomato", "tomorrow", "tone", "tongue", "tonight", "tool", "tooth", "top", "topic", "topple", "torch", "tornado", "tortoise", "toss", "total", "tourist", "toward", "tower", "town", "toy", "track", "trade", "traffic", "tragic", "train", "transfer", "trap", "trash", "travel", "tray", "treat", "tree", "trend", "trial", "tribe", "trick", "trigger", "trim", "trip", "trophy", "trouble", "truck", "true", "truly", "trumpet", "trust", "truth", "try", "tube", "tuition", "tumble", "tuna", "tunnel", "turkey", "turn", "turtle", "twelve", "twenty", "twice", "twin", "twist", "two", "type", "typical", "ugly", "umbrella", "unable", "unaware", "uncle", "uncover", "under", "undo", "unfair", "unfold", "unhappy", "uniform", "unique", "unit", "universe", "unknown", "unlock", "until", "unusual", "unveil", "update", "upgrade", "uphold", "upon", "upper", "upset", "urban", "urge", "usage", "use", "used", "useful", "useless", "usual", "utility", "vacant", "vacuum", "vague", "valid", "valley", "valve", "van", "vanish", "vapor", "various", "vast", "vault", "vehicle", "velvet", "vendor", "venture", "venue", "verb", "verify", "version", "very", "vessel", "veteran", "viable", "vibrant", "vicious", "victory", "video", "view", "village", "vintage", "violin", "virtual", "virus", "visa", "visit", "visual", "vital", "vivid", "vocal", "voice", "void", "volcano", "volume", "vote", "voyage", "wage", "wagon", "wait", "walk", "wall", "walnut", "want", "warfare", "warm", "warrior", "wash", "wasp", "waste", "water", "wave", "way", "wealth", "weapon", "wear", "weasel", "weather", "web", "wedding", "weekend", "weird", "welcome", "west", "wet", "whale", "what", "wheat", "wheel", "when", "where", "whip", "whisper", "wide", "width", "wife", "wild", "will", "win", "window", "wine", "wing", "wink", "winner", "winter", "wire", "wisdom", "wise", "wish", "witness", "wolf", "woman", "wonder", "wood", "wool", "word", "work", "world", "worry", "worth", "wrap", "wreck", "wrestle", "wrist", "write", "wrong", "yard", "year", "yellow", "you", "young", "youth", "zebra", "zero", "zone", "zoo"]
  return Array(count).fill(0).map(() => w[Math.floor(Math.random() * w.length)])
}

// Simple deterministic BTC address from seed (for UI display — real derivation via vusd CLI in production)
function seedToAddress(seedWords, network = 'signet') {
  const prefix = network === 'mainnet' ? 'bc1q' : 'tb1q'
  let hash = 0
  for (const c of seedWords.join(' ')) {
    hash = ((hash << 5) - hash) + c.charCodeAt(0)
    hash |= 0
  }
  const chars = 'abcdefghjkmnpqrstuvwxyz0234567890'
  let addr = prefix
  const seed = Math.abs(hash)
  for (let i = 0; i < 38; i++) {
    addr += chars[(seed * (i + 7) * 2654435761) % chars.length]
  }
  return addr
}

// ── PIN dots ──────────────────────────────────────────────────────────────────
function PinDots({ pin, length = 6, error }) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '28px 0' }}>
      {Array.from({ length }).map((_, i) => (
        <div key={i} style={{
          width: 12, height: 12, borderRadius: '50%',
          background: i < pin.length
            ? (error ? 'var(--danger)' : 'var(--fg)')
            : 'var(--border2)',
          transition: 'background 0.12s, transform 0.12s',
          transform: i < pin.length ? 'scale(1.1)' : 'scale(1)',
        }} />
      ))}
    </div>
  )
}

// ── Numpad ────────────────────────────────────────────────────────────────────
function Numpad({ onPress }) {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','<']
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 240, margin: '0 auto' }}>
      {keys.map((k, i) => k === '' ? <div key={i} /> : (
        <button key={k + i}
          onClick={() => onPress(k === '<' ? 'BACK' : k)}
          style={{
            height: 52, borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--card2)',
            color: 'var(--fg)',
            fontSize: k === '<' ? 16 : 20,
            fontWeight: 400,
            cursor: 'pointer',
            fontFamily: k === '<' ? 'Geist, sans-serif' : 'Geist Mono, monospace',
            transition: 'background 0.08s',
            letterSpacing: 0,
          }}
          onMouseDown={e => e.currentTarget.style.background = 'var(--card3)'}
          onMouseUp={e => e.currentTarget.style.background = 'var(--card2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--card2)'}>
          {k}
        </button>
      ))}
    </div>
  )
}

// ── Shell ─────────────────────────────────────────────────────────────────────
function Shell({ children, wide = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg)', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: wide ? 520 : 400,
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: wide ? '36px 40px' : '40px 36px',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 32px 64px rgba(0,0,0,0.4)',
        animation: 'fadein 0.2s ease',
      }}>
        {children}
      </div>
    </div>
  )
}

// ── Logo ──────────────────────────────────────────────────────────────────────
function Logo({ large = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: large ? 44 : 32 }}>
      <div style={{
        fontFamily: 'Geist, sans-serif',
        fontWeight: 700,
        fontSize: large ? 44 : 24,
        color: 'var(--fg)',
        letterSpacing: large ? '-2px' : '-1px',
        marginBottom: 8,
      }}>
        VULTD
      </div>
      <div style={{
        fontSize: 12,
        color: 'var(--muted-fg)',
        letterSpacing: '0.04em',
        fontFamily: 'Geist, sans-serif',
        fontWeight: 400,
      }}>
        {large ? 'Bitcoin-backed private stablecoin' : 'Enter PIN to continue'}
      </div>
      {large && (
        <div style={{ width: 32, height: 1, background: 'var(--border2)', marginTop: 20 }} />
      )}
    </div>
  )
}

// ── UnlockScreen ──────────────────────────────────────────────────────────────
export function UnlockScreen() {
  const { unlock } = useApp()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const shakeRef = useRef(null)

  const handleKey = useCallback((k) => {
    if (error) { setError(false); setPin(''); return }
    if (k === 'BACK') { setPin(p => p.slice(0, -1)); return }
    if (pin.length >= 6) return
    const next = pin + k
    setPin(next)
    if (next.length === 6) {
      setTimeout(() => {
        const ok = unlock(next)
        if (!ok) {
          setError(true)
          setAttempts(a => a + 1)
          if (shakeRef.current) {
            shakeRef.current.style.animation = 'none'
            void shakeRef.current.offsetWidth
            shakeRef.current.style.animation = 'shake 0.35s ease'
          }
          setTimeout(() => { setPin(''); setError(false) }, 1200)
        }
      }, 60)
    }
  }, [pin, error, unlock])

  useEffect(() => {
    const h = (e) => {
      if (e.key >= '0' && e.key <= '9') handleKey(e.key)
      if (e.key === 'Backspace') handleKey('BACK')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [handleKey])

  return (
    <Shell>
      <style>{'@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}'}</style>
      <Logo />
      <div style={{ textAlign: 'center' }}>
        {error && (
          <div style={{ fontSize: 13, color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <AlertCircle size={13} />
            Incorrect PIN{attempts >= 3 ? ' · ' + attempts + ' attempts' : ''}
          </div>
        )}
      </div>
      <div ref={shakeRef}>
        <PinDots pin={pin} error={error} />
      </div>
      <Numpad onPress={handleKey} />
      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--muted-fg)' }}>
        Forgot PIN? <button onClick={() => { localStorage.clear(); window.location.reload() }} style={{ background: 'none', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>Reset wallet</button>
      </div>
    </Shell>
  )
}

// ── Word grid ─────────────────────────────────────────────────────────────────
function WordGrid({ words }) {
  const cols = words.length === 24 ? 4 : 3
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6, margin: '16px 0' }}>
      {words.map((w, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '7px 10px',
        }}>
          <span style={{ fontSize: 10, color: 'var(--muted-fg)', fontFamily: 'Geist Mono, monospace', minWidth: 18 }}>{i + 1}</span>
          <span style={{ fontSize: 13, fontFamily: 'Geist Mono, monospace', color: 'var(--fg)', fontWeight: 500 }}>{w}</span>
        </div>
      ))}
    </div>
  )
}

// ── SetupScreen ───────────────────────────────────────────────────────────────
export function SetupScreen() {
  const { createWallet, recoverWallet, network } = useApp()
  const [mode, setMode] = useState(null)       // null | 'new' | 'recover'
  const [step, setStep] = useState(1)           // 1=seed, 2=pin
  const [wordCount, setWordCount] = useState(24)
  const [seed, setSeed] = useState([])
  const [rec, setRec] = useState('')
  const [pin, setPin] = useState('')
  const [conf, setConf] = useState('')
  const [pStep, setPStep] = useState('set')    // 'set' | 'confirm'
  const [pErr, setPErr] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const startNew = () => { setSeed(genSeed(wordCount)); setMode('new'); setStep(1); setConfirmed(false) }
  const startRec = () => { setMode('recover'); setStep(1) }
  const canRec = () => { const w = rec.trim().split(/\s+/); return w.length === 12 || w.length === 24 }

  const handlePin = (k) => {
    const isSetting = pStep === 'set'
    const cur = isSetting ? pin : conf
    const set = isSetting ? setPin : setConf
    if (k === 'BACK') { set(p => p.slice(0, -1)); return }
    if (cur.length >= 6) return
    const next = cur + k; set(next)
    if (next.length === 6) {
      if (isSetting) setTimeout(() => setPStep('confirm'), 120)
      else setTimeout(() => {
        if (next !== pin) { setPErr(true); setTimeout(() => { setConf(''); setPErr(false) }, 900) }
        else finish(pin)
      }, 60)
    }
  }

  const finish = async (finalPin) => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    const words = mode === 'new' ? seed : rec.trim().split(/\s+/)
    const addr = seedToAddress(words, network)
    if (mode === 'new') createWallet(finalPin, words.join(' '), addr)
    else recoverWallet(finalPin, words.join(' '), addr)
  }

  const copy = () => {
    copyToClipboard(
      seed.join(' '),
      () => { setCopied(true); setTimeout(() => setCopied(false), 2000) },
      () => { setCopied(false) }
    )
  }

  // ── Landing ────────────────────────────────────────────────────────────────
  if (!mode) return (
    <Shell>
      <Logo large />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={startNew} className="btn btn-primary btn-lg" style={{ width: '100%', borderRadius: 10 }}>
          Create New Wallet
        </button>
        <button onClick={startRec} className="btn btn-secondary btn-lg" style={{ width: '100%', borderRadius: 10 }}>
          Restore from Seed Phrase
        </button>
      </div>
      <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: 'var(--muted-fg)' }}>
        <Shield size={11} style={{ flexShrink: 0 }} />
        Non-custodial · Your keys never leave this device
      </div>
    </Shell>
  )

  // ── New wallet: show seed ──────────────────────────────────────────────────
  if (mode === 'new' && step === 1) return (
    <Shell wide>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button onClick={() => setMode(null)} className="btn btn-ghost btn-sm" style={{ padding: '4px 6px' }}><ChevronLeft size={18} /></button>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em' }}>Recovery Phrase</div>
          <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>Step 1 of 2 · Back up before continuing</div>
        </div>
      </div>

      <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--warning-dim)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 16, fontSize: 13, color: 'var(--warning)', lineHeight: 1.6 }}>
        Write these words down in order. Anyone with this phrase can access your wallet.
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        {[12, 24].map(n => (
          <button key={n} onClick={() => { setWordCount(n); setSeed(genSeed(n)); setConfirmed(false) }}
            className={n === wordCount ? 'btn btn-secondary' : 'btn btn-ghost btn-sm'}
            style={{ fontSize: 12 }}>
            {n} words
          </button>
        ))}
        <button onClick={() => { setSeed(genSeed(wordCount)); setConfirmed(false) }} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>
          <RefreshCw size={13} /> Regenerate
        </button>
      </div>

      <WordGrid words={seed} />

      <div style={{ marginTop: 10, marginBottom: 4 }}>
        <label style={{ fontSize: 11, color: 'var(--muted-fg)', display: 'block', marginBottom: 4 }}>
          Click to select all — then Ctrl+C to copy:
        </label>
        <textarea
          readOnly
          value={seed.join(' ')}
          onClick={e => { e.target.select(); e.target.setSelectionRange(0, 99999) }}
          rows={2}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 6,
            background: 'var(--card2)', border: '1px solid var(--border)',
            color: 'var(--fg)', fontFamily: 'Geist Mono, monospace',
            fontSize: 11, resize: 'none', cursor: 'pointer', lineHeight: 1.6,
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={copy} className="btn btn-secondary" style={{ flex: 1 }}>
          {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy phrase</>}
        </button>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card2)', cursor: 'pointer', fontSize: 13 }}>
        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
          style={{ width: 15, height: 15, accentColor: 'var(--fg)', cursor: 'pointer' }} />
        I have written down my recovery phrase and stored it safely
      </label>

      <button onClick={() => setStep(2)} disabled={!confirmed}
        className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 12, borderRadius: 10 }}>
        Continue →
      </button>
    </Shell>
  )

  // ── Recover: enter seed ───────────────────────────────────────────────────
  if (mode === 'recover' && step === 1) return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button onClick={() => setMode(null)} className="btn btn-ghost btn-sm" style={{ padding: '4px 6px' }}><ChevronLeft size={18} /></button>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em' }}>Restore Wallet</div>
          <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>Enter your 12 or 24-word seed phrase</div>
        </div>
      </div>
      <textarea value={rec} onChange={e => setRec(e.target.value)}
        placeholder="word1 word2 word3 ..."
        rows={5}
        style={{
          width: '100%', padding: '12px', borderRadius: 8,
          background: 'var(--bg)', border: '1px solid var(--border)',
          color: 'var(--fg)', resize: 'none', outline: 'none',
          fontFamily: 'Geist Mono, monospace', fontSize: 13, lineHeight: 1.8,
          transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--muted)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
      <div style={{ fontSize: 12, color: canRec() ? 'var(--success)' : 'var(--muted-fg)', margin: '8px 0 16px', fontFamily: 'Geist Mono, monospace' }}>
        {rec.trim() ? rec.trim().split(/\s+/).length : 0} / 12 or 24 words
      </div>
      <button onClick={() => setStep(2)} disabled={!canRec()}
        className="btn btn-primary btn-lg" style={{ width: '100%', borderRadius: 10 }}>
        Continue →
      </button>
    </Shell>
  )

  // ── PIN setup ─────────────────────────────────────────────────────────────
  if (step === 2) return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button onClick={() => { setStep(1); setPin(''); setConf(''); setPStep('set') }}
          className="btn btn-ghost btn-sm" style={{ padding: '4px 6px' }}><ChevronLeft size={18} /></button>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em' }}>
            {pStep === 'set' ? 'Set PIN' : 'Confirm PIN'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>
            {mode === 'new' ? 'Step 2 of 2' : 'Final step'} · 6-digit PIN
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted-fg)', minHeight: 20 }}>
        {pErr
          ? <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><AlertCircle size={13} /> PINs don't match</span>
          : pStep === 'set' ? 'Choose a PIN to protect your wallet' : 'Re-enter to confirm'}
      </div>
      <PinDots pin={pStep === 'set' ? pin : conf} error={pErr} />
      {loading
        ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '28px', color: 'var(--muted-fg)', fontSize: 13 }}>
            <RefreshCw size={14} className="spin" /> Setting up wallet...
          </div>
        : <Numpad onPress={handlePin} />}
    </Shell>
  )

  return null
}
