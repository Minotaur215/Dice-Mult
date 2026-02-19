/*:
 * @target MV
 * @plugindesc Dice Roll for Skills and Items (Damage/ Healing multipliers; Random State Application) 
 * @author Minotaur1
 *
 * @param DefaultDiceSides
 * @text Default Dice Sides
 * @type number
 * @min 2
 * @default 6
 *
 * @help
 * ============================================================================ 
 * Dice Roll Plugin Overview
 * ============================================================================ 
 * This plugin adds dice-based mechanics to skills and items of your choosing. Each use of a skill or 
 * item can roll a virtual dice to determine damage, healing, or random state effects.
 *
 * Features:
 *   - Dice-based damage and healing scaling
 *   - Custom dice sides per skill/item
 *   - Random state application within a specified range
 *   - Battle log messages for rolls and state application
 *   - "mult" variable for cleaner formulas
 *
 * ============================================================================ 
 * Notetags for Skills and Items
 * ============================================================================ 
 * <Dice_mult>             -> Enables dice damage/healing scaling using default formula
 * <Dice_mult:X>           -> Enables dice scaling with custom multiplier X
 * <Dice_sides:X>          -> Overrides default dice sides for this skill/item
 * <Dice_state>            -> Applies a random state to target (default: ID 3 → last state)
 * <Dice_state:X-Y>        -> Applies a random state to target within IDs X to Y
 *
 * Examples:
 *   <Dice_mult>            -> Scales damage/healing with default dice sides
 *   <Dice_mult:1.5>        -> Uses a custom multiplier of 1.5
 *   <Dice_sides:8>         -> Uses an 8-sided dice for this skill/item
 *   <Dice_state>            -> Applies a random state from ID 3 to last
 *   <Dice_state:5-10>      -> Applies a random state between IDs 5 and 10
 *
 * ============================================================================ 
 * Dice Roll Variables
 * ============================================================================ 
 * - roll : The result of the dice roll (1 → number of sides)
 * - mult : Multiplier calculated from the roll using:
 *          mult = 0.5 + (roll - 1) * 0.3
 *   This multiplier scales damage or healing relative to the dice roll.
 *
 * Variables stored in game:
 *   4 = Dice roll result (roll)
 *   5 = Final damage/heal result OR applied state ID
 *
 * ============================================================================ 
 * Dice Roll Formula
 * ============================================================================ 
 * For damage or healing:
 *   Result = BaseStat * mult
 *   BaseStat = ATK for physical skills/items
 *            = MAT for magical or healing skills/items
 *
 * Example:
 *   - Dice roll = 4 on a 6-sided dice
 *   - mult = 0.5 + (4 - 1) * 0.3 = 1.4
 *   - BaseStat = 100
 *   - Result = 100 * 1.4 = 140 damage/healing
 *
 * ============================================================================ 
 * Behavior Details
 * ============================================================================ 
 * Damage & Healing:
 *   - Works for skills/items with <Dice_mult>
 *   - Calculates roll and multiplier once per use
 *   - Scales HP/MP recovery and attack damage
 *   - Battle log shows: "Item/Skill X rolled a Y! Multiplier: Z, Result: R"
 *
 * Random States:
 *   - Works for <Dice_state> and <Dice_state:X-Y>
 *   - Randomly chooses a valid state that the target doesn't already have
 *   - Registers success automatically
 *   - Battle log shows: "State applied: StateName"
 *
 * Notes:
 *   - Works in battle and menu usage
 *   - Default dice sides can be set in plugin parameters
 *   - Safe handling for missing/invalid notetags
 *   - Cleaner code using roll + mult variables
 *
 * ============================================================================ 
 */

(() => {
	
	// Retrieves plugin parameters
	const pluginParams = PluginManager.parameters('Dice_Mult');
	const DEFAULT_SIDES = Number(pluginParams['DefaultDiceSides'] || 6);

	// Stores original functions to call later if a tag isn't used
	const _makeDamageValue = Game_Action.prototype.makeDamageValue;
	const _applyItemEffect = Game_Action.prototype.applyItemEffect;
	const _apply = Game_Action.prototype.apply;

	// =====================================================
	// DAMAGE + HEALING SKILLS SECTION
	// =====================================================

	Game_Action.prototype.makeDamageValue = function(target, critical) {

		const item = this.item();										// Current skill or item being used
		const subject = this.subject();										// The user of the skill/item

		if (item && item.meta.Dice_mult !== undefined) {

		const sides = Number(item.meta.Dice_sides) || DEFAULT_SIDES;						// Custom dice sides

		// Dice roll and multiplier
		const roll = Math.floor(Math.random() * sides) + 1;							// Rolls the dice, allows you to feel the fear in your enemy's eyes
		const mult = 0.5 + (roll - 1) * 0.3;									// Multiplier formula
		$gameVariables.setValue(4, roll);									// Store roll in variable 4

		// Determines base stat
		let baseStat = 0;
		if (item.hitType === 1) baseStat = subject.atk;
		else if (item.hitType === 2 || item.damage.type === 3) baseStat = subject.mat;
		else baseStat = subject.atk;

		// Applies multiplier to base stat
		const result = Math.floor(baseStat * mult);
		$gameVariables.setValue(5, result);

		// Battle log message if in battle
		if (BattleManager._logWindow) {
			BattleManager._logWindow.push(
				'addText',
				item.name + " rolled a " + roll + "! Multiplier: " + mult + ", Result: " + result
			);
		}
	}
		// Calls original damage calculation if <Dice_mult> isn't in the notes
		return _makeDamageValue.call(this, target, critical);
   	};

    	// =====================================================
    	// ITEM EFFECTS SECTION (HP/MP RECOVERY)
    	// =====================================================
	Game_Action.prototype.applyItemEffect = function(target, effect) {

		const item = this.item();

        	if (item && item.meta.Dice_mult !== undefined) {

			const sides = Number(item.meta.Dice_sides) || DEFAULT_SIDES;

			// Dice roll and multiplier
			const roll = Math.floor(Math.random() * sides) + 1;
			const mult = 0.5 + (roll - 1) * 0.3;
			$gameVariables.setValue(4, roll);

			// Recovery items
			switch (effect.code) {

				case Game_Action.EFFECT_RECOVER_HP: {
					const baseHeal = target.mhp * effect.value1 + effect.value2;
					const result = Math.floor(baseHeal * mult);
					$gameVariables.setValue(5, result);
					target.gainHp(result);
					break;
					}

				case Game_Action.EFFECT_RECOVER_MP: {
					const baseMP = target.mmp * effect.value1 + effect.value2;
					const result = Math.floor(baseMP * mult);
					$gameVariables.setValue(5, result);
					target.gainMp(result);
					break;
					}

				default:
					_applyItemEffect.call(this, target, effect);
					break;
			}
			// Again, if in battle, adds a battle log message
			if (BattleManager._logWindow) {
				BattleManager._logWindow.push(
					'addText',
					"Item " + item.name + " rolled a " + roll + "! Multiplier: " + mult
				);
			}

		} else {
			// Calls original damage calculation if <Dice_mult> isn't in the notes
            		_applyItemEffect.call(this, target, effect);
		}
	};

    // =====================================================
    // DICE_STATE SECTION
    // =====================================================

	Game_Action.prototype.apply = function(target) {

		// Runs normal engine logic first
		_apply.call(this, target);

		const item = this.item();
		if (!item || item.meta.Dice_state === undefined) return;						// Skips if no <Dice_state> in notes

		// Range of states applicable using the database list
		let min = 3;
		let max = $dataStates.length - 1;

		// Ensures that the Dice_state is a string before matching
		const stateTag = String(item.meta.Dice_state);
		const match = stateTag.match(/(\d+)-(\d+)/);
		if (match) {
			min = Number(match[1]);
			max = Number(match[2]);
			if (min > max) [min, max] = [max, min];								// In case the numbers are reversed
		}

		// Filter states: Is it a valid state and not already applied?
		const validStates = $dataStates.filter(s =>
			s && s.id >= min && s.id <= max && !target.isStateAffected(s.id)				
		);

		if (validStates.length === 0) return;									// If no valid states

		// Picks a random state from the filtered list
		const randIndex = Math.floor(Math.random() * validStates.length);
		const randState = validStates[randIndex];


		target.addState(randState.id);										// Applies said state
		target.result().success = true; 									// Ensures item/skill registers a success

		// Battle log message if in battle
		if ($gameParty.inBattle() && BattleManager._logWindow) {
			BattleManager._logWindow.push(
				'addText',
				"State applied: " + randState.name
			);
		}

		// Store applied state ID in variable 5
		$gameVariables.setValue(5, randState.id);
	};

})();
