# IRL: In Remote Life  (text edition)
A text-based life sim. Plain HTML + JS modules + JSON data, no build step.

## Run
JSON loads via fetch, so serve the folder:  python3 -m http.server  ->  http://localhost:8000
(or host on GitHub Pages). Click options or press number keys. Auto-saves in your browser.

## Random lives
Each new game rolls a country (197), an age (5-85) and a profession. Reroll as often as you like before starting.
- data/countries.json  rows: name|region|income tier 1-5|currency|rate per USD (approx)|food|city
- data/regions.json    regional flavor (eatery type, shop type, local names, street atmosphere)
- data/professions.json careers with age and income-tier limits
In data text, @N = a cost and #N = income; both scale by the country's prices, wages and currency. Tokens like {city}, {food}, {cook} are filled per country.

## Backstory
Every character starts with a past: a full name, family (alive or late, with bond levels), friends, how long they've lived in town, education, traits, a hobby, a keepsake and three memories. data/people.json (names per region) and data/backstory.json (traits, memories, hobbies...) drive it. Family events in data/events.json use `has` (parent, sibling, spouse, child).

## Data files (add content without code)
- data/world.json   locations, descriptions by time of day, exits, actions
- data/jobs.json    careers with levels, pay, shifts, promotions
- data/events.json  random encounters with choices and skill-based odds
- data/items.json   items (price = sold at Corner Mart)
- data/config.json  start stats, rent, decay rates, weather

## Effect keys (used by actions, events, items)
time, money, health, hunger, energy, mood, heat, rep, sk:{skill:+n}, item:"id", flag:{k:v}
Actions may have chance:{base,sk,per} with win/lose outcomes; req:{money,energy,sk,open}.

## Code
js/main.js loads data. js/game.js is the engine (time, needs, rent, jobs, events, saving).

## Creator and feelings
The start screen lets you pick name, age, gender, region and country (any left on Random are rolled; picking a region rolls a country inside it). Hidden feelings (mood, stress, loneliness) drift with time, money, hunger, sleep and company; activities and bonds move them, mood nudges odds of success, and the status line describes how you feel in words. Events can require feelings via `min:{stress:70}`.

## Time skips
'Let time pass…' skips a few hours, a day, a week, a month, a year or a decade. Skips run a coarse life simulation (income, rent, aging, family deaths, school to work to retirement, feelings settling) and add moments from data/lifeevents.json. A skip stops early if your health collapses or you get locked out for unpaid rent.

## People and profiles
Every NPC is a profile (family, friends, locals like the cook, clerk and Rook, and anyone new you meet by striking up conversations or through the years). Open the People tab for each person's bio, bond, history and things to do with them (catch up, spend time, share a meal, help, ask for money or advice, gift, clear the air). The You tab shows your own profile, feelings, skills, relationships and a life journal. Add a `with` (and optional `bd:{w,l}`) to a world action to tie it to a local; add `type:"meet"` actions to let players meet new people anywhere.

## Talent, dedication, luck, grinding
Every character is rolled with hidden-but-visible traits (shown on the You tab and in the start screen's bio):
- **Talent** per skill (fitness, charisma, intellect, street), 1-10. Sets how fast a skill grows and nudges the odds of skill-based outcomes.
- **Dedication** (0-100). Rises on days you work, study or practice, fades on idle days. Raises learning speed, grades, shift quality and promotion odds. Traits like careful or restless shift the starting value (`ded` in data/backstory.json).
- **Luck**: an innate value plus short swings from events (`luck` effect key, e.g. `"x":{"luck":3}`). It biases chance rolls, exams, admissions, career landing, and the odds of events tagged `"lk":1` (good) or `"lk":-1` (bad) in events.json and lifeevents.json.
- **Grinding**: each skill gain is `base x talent x dedication / (1 + level x 0.3)`. Practicing the same skill within 3 days builds momentum (up to +40%). Unused skills slowly lose progress toward the next level, but never drop a whole level. Practice actions: study, push-ups, laps, talking to strangers, sleight of hand, gym, library.

## Education and career path
- School builds an **academic record** (0-100) through classes (`ed` effect key), studying and exam papers. Skipping weekday classes erodes it.
- At 18 you sit finals, then choose: **university** (3-4 years, pick a field, tuition goes on a student loan, scholarships for strong records), a **trade apprenticeship** (2 years), or **work**. Admission odds are shown and depend on grades, talent and luck. Dropping out is possible at any time (Work tab).
- Education level (none, secondary, trade, degree) gates professions through `ed` in data/professions.json; `f` is the field. Where you land is weighted by education, field, grades, dedication, talent fit and luck. Degree-level careers pay far more.
- On the job, promotions (`rank`) come from dedication, talent and luck, and shifts can go very well or badly. Student loans are repaid from wages.

## Height and weight
Height and weight are rolled per region and gender (data/config.json `body.h`), or typed in on the start screen (cm / kg). Kids grow along an age curve, adults shrink slightly in old age, and weight drifts with how well you eat and how much you train. Build affects energy drain and fitness gains, and height gives a small edge on fitness and street rolls.

## Love and relationships (adults only, 18+)
A full relationship engine lives in js/romance.js, with all text and tuning in data/romance.json. The Love tab is the hub; every person's profile also has a 'Romance and relationship' menu.
- **Meeting people**: dating app, chatting someone up where you are, friends setting you up, or romance with existing friends. Each person has hidden compatibility: attachment style, love language (discovered over time), values, wish for children, desire level, jealousy and family approval.
- **Stages**: friend, flirting, dating (not exclusive), together (exclusive), engaged, married, separated, ex, widowed. Meters per person: chemistry, love, passion, trust, commitment, resentment, comfort. Passion fades, love grows with trust, neglect breeds resentment.
- **Dates and gestures**: 17 date types (coffee to weekend getaway) with quality rolls, love-language bonuses, compliments, 'I love you', meeting each other's families.
- **Intimacy**: always consensual and non-explicit (fade to black). Partners need enough comfort first, can decline, and desire levels can mismatch.
- **Protection**: condoms, the pill, IUD, implant, emergency contraception, pregnancy tests, sexual health checks, testing together, treatment, telling a partner honestly. Unprotected nights can mean pregnancy or infection.
- **Pregnancy and children**: trying for a baby, prenatal care, nursery, miscarriage risk, birth and naming, custody, child costs, children moving out.
- **Commitment**: making it official, moving in (shared rent), proposing with a ring tier, prenups, four wedding types with guest gifts, honeymoon, anniversaries.
- **Conflict and care**: arguments, jealousy, apologies, counseling, comfort, walking a partner home, support through job loss, grief and illness.
- **Cheating**: temptation events, secret affairs with discovery risk, suspected partner infidelity, forgiveness or ending it.
- **Breakups, separation, divorce**: kind, blunt or ghosted breakups, being left, trial separation, reconciliation, divorce (uncontested, mediated, contested), asset split, prenup, custody, spousal and child support.
- **Safety**: controlling-partner red flags, talking to friends, leaving safely, emergency help, protective orders, handling an ex who will not let go.
- Events use data/romance.json `ev` (choices with `chance`, `win`, `lose`, partner meter changes `r`, player effects `x`, and action tokens `a`). Time skips simulate relationships too and auto-resolve events.

## Items, stores and needs
Everything lives in js/shop.js, data/items.json and data/stores.json (plus the shop locations in data/world.json). Prices are base values that scale with the country (`glob:1` items such as tech scale less, so a laptop stays expensive in poorer places).
- **Pockets / Items tab**: carried items (capacity 14, +10 with a backpack), gear with condition bars, and home supplies. Use food, medicine and books from here.
- **Gear** (`gear:{slot,t,life,pas}` in items.json) is owned as instances with a condition. The best working item per slot is in use. It wears out over `life` days, wears faster in rain, and tech can break at random. Spare or broken gear can be sold or repaired.
- **Home supplies** are not carried: groceries fill the pantry (`sup:{meals}`), toiletries fill the washing stock (`sup:{wash}`). Cooking uses a meal, washing uses a wash. Living with family covers both. Skip too long without washing and mood, stress and reputation slip.
- **Subscriptions** (`svc`): a phone plan (needed for messages, calls and the dating app) and home internet (needed for laptop work at home). Libraries and cafes offer wifi. Both lapse if you forget them.
- **Needs that cost money**: clothes wear out (shabby clothes cut shift pay and social odds), a coat, rain gear and a sun hat soften bad weather, bedding and a fan or heater improve sleep, a laptop tier raises freelance pay, a toolkit allows DIY repairs.
- **Stores** (Shopping Row off the main street): Fresh Market, Pharmacy, Electronics, Clothing, Hardware and Home, Books and Gifts, plus the Corner Shop and Rook's used-goods counter in the alley. Each has its own clerk (an NPC). Chatting builds a loyalty discount (up to 10%), haggling can win 8% off for the day, limited stock restocks weekly, and some stores buy things back.
- **NPC inventories**: every person carries a few items (shown on their profile, with `npc` weights in items.json deciding what). Give them gifts from your pockets (hobby matches in `lk` land harder), or ask a close contact to spare something. Family and close friends may give you a gift on your birthday. Their belongings drift over time.
- **Item keys**: `cat`, `price`, `x` (effects when used), `text`, `w` (weight), `gift` (gift value), `lk` (hobby regex), `npc` (NPC carry weight), `sup`, `svc`, `gear`, `act` (a home action the item unlocks), `lim` (limited stock), `pl` (plural wording).
- **Time skips** assume you keep up with needs (the flat living cost already covers them); broken essentials are replaced with the cheapest option you can afford.
