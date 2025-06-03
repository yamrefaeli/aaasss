# Game Design Document: מגיני הפלאפל נגד מפלצות החומוס

## 1. Game Title
מגיני הפלאפל נגד מפלצות החומוס (Falafel Protectors vs. Hummus Monsters)

## 2. Core Gameplay
*   **Genre:** Tower Defense
*   **Objective:** Prevent Hummus Monsters from reaching the player's base (e.g., a falafel stand on the left side of the screen).
*   **Mechanics:**
    *   Players place "Falafel Protector" units on a grid-based game board.
    *   Hummus Monsters advance in waves from the right side of the screen towards the left.
    *   Protectors automatically attack monsters within their range.
    *   Players collect "גַרְגֵרֵי חוּמוּס" (Chickpea Coins) by defeating monsters or through other means (e.g., special coin-producing protectors later on).
    *   Chickpea Coins are used to purchase and upgrade protectors.

## 3. Protector Units (Initial Set)

*   **כדור פלאפל רגיל (Regular Falafel Ball)**
    *   **Cost:** 100 Chickpea Coins
    *   **Description:** Shoots single falafel balls at monsters.
    *   **Damage:** Basic
    *   **Range:** Medium
    *   **Attack Speed:** Medium

*   **פלאפל חריף (Spicy Falafel)**
    *   **Cost:** 150 Chickpea Coins
    *   **Description:** Shoots a spicy falafel that deals splash damage to a small area.
    *   **Damage:** Medium, Area of Effect
    *   **Range:** Medium
    *   **Attack Speed:** Slow

*   **טחינה רכה (Soft Tahini)**
    *   **Cost:** 75 Chickpea Coins
    *   **Description:** Sprays tahini that slows down monsters in a line or small area. Does minimal or no damage.
    *   **Effect:** Slows monster movement speed.
    *   **Range:** Short to Medium
    *   **Attack Speed:** Continuous spray / Fast pulses

## 4. Monster Units (Initial Set)

*   **גוש חומוס (Hummus Glob)**
    *   **Health:** Low
    *   **Speed:** Slow
    *   **Damage to Base:** Low
    *   **Special:** None

*   **פיתה מהירה (Fast Pita)**
    *   **Health:** Very Low
    *   **Speed:** Fast
    *   **Damage to Base:** Medium (due to speed, can overwhelm if not dealt with)
    *   **Special:** Dodges occasionally? (Maybe for a future "Advanced Pita") For now, just fast.

## 5. Game Currency
*   **Name:** גַרְגֵרֵי חוּמוּס (Chickpea Coins)
*   **Acquisition:** Defeating monsters, end-of-wave bonuses, potentially special units.

## 6. Winning/Losing Conditions
*   **Losing:**
    *   If a certain number of monsters reach the player's base.
    *   If the player's "base health" (e.g., integrity of the falafel stand) reaches zero.
*   **Winning (Level-based):**
    *   Successfully defending against all monster waves in a level.

## 7. UI Layout Sketch (Conceptual)
*   **Top Bar:** Chickpea Coins, Current Wave # / Total Waves, Player Base Health, Pause Button.
*   **Game Area (Center):** Grid for placing protectors. Monsters enter from right, move left.
*   **Side Bar (Right or Bottom):** Protector selection panel. Each protector shows icon, cost, and a brief description.

## 8. Future Ideas (Beyond Initial Scope)
*   More protector types (e.g., Pickle Wall, Amba Bomber).
*   More monster types (e.g., Eggplant Brute, Garlic Boss with special abilities).
*   Upgrade system for protectors.
*   Special one-time-use abilities (e.g., "Schug Frenzy" - temp attack boost for all units).
*   Multiple levels with different layouts and challenges.
*   Persistent player progress/unlocks.
