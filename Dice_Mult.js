/*:
 * @target MV
 * @plugindesc Dice Roll for Skills and Items
 * @author Minotaur1
 *
 * @param DefaultDiceSides
 * @text Default Dice Sides
 * @type number
 * @min 2
 * @default 6
 * @desc Default number of sides for the dice roll if not specified in skill/item notetag.
 *
 * @param DefaultMultiplier
 * @text Default Damage Multiplier
 * @type number
 * @min 0
 * @decimals 2
 * @default 1
 * @desc Default multiplier for damage/effect calculation if not specified in skill/item notetag.
 *
 * @help
 * ============================================================================
 * Notetags:
 * ============================================================================
 * <Dice_mult>         -> Enables dice multiplier using default multiplier
 * <Dice_mult:X>       -> Sets custom multiplier (X = number)
 * <Dice_sides:X>      -> Sets custom dice sides (X = number)
 *
 * Example:
 * <Dice_mult>
 * <Dice_mult:1.5>
 * <Dice_sides:8>
 *
 * Variables Used:
 * 4 = Dice roll result
 * 5 = Final damage/effect result
 *
 * In battle, displays:
 * "A [number] was rolled!"
 *
 * Standard 6-sided scaling (50% to 200%) formula:
 * (0.5 + (roll - 1) * 0.3)
 * ============================================================================
 */

(() => {

    const pluginParams = PluginManager.parameters('DiceRollMultiplier');
    const DEFAULT_SIDES = Number(pluginParams['DefaultDiceSides'] || 6);
    const DEFAULT_MULT = Number(pluginParams['DefaultMultiplier'] || 1);

    // Store original functions so I don't break the engine...
    const _Dice_makeDamageValue = Game_Action.prototype.makeDamageValue;
    const _Dice_applyItemEffect = Game_Action.prototype.applyItemEffect;

// SKILL DAMAGE
    Game_Action.prototype.makeDamageValue = function(target, critical) {
        const item = this.item();
        const subject = this.subject();

        // If skill has dice notetag
        if (item && item.meta.Dice_mult !== undefined && DataManager.isSkill(item)) {

            const multiplier = Number(item.meta.Dice_mult) || DEFAULT_MULT;
            const sides = Number(item.meta.Dice_sides) || DEFAULT_SIDES;

            // Rolls the dice, allows you to feel the fear in your enemy's eyes
            const roll = Math.floor(Math.random() * sides) + 1;
            const diceScale = multiplier * (0.5 + (roll - 1) * 0.3);

            $gameVariables.setValue(4, roll);

            let result = 0;

            // Skills: calculate damage using ATK
            const attackStat = subject.atk;
            result = Math.floor(4 * attackStat * diceScale);

            $gameVariables.setValue(5, result);

            if (BattleManager._logWindow) {
                BattleManager._logWindow.push('addText', `A ${roll} was rolled!`);
            }

            return Math.max(0, result);
        }

        return _Dice_makeDamageValue.call(this, target, critical);
    };


// ITEM EFFECTS (Healing, MP Recovery, States, etc.)

    Game_Action.prototype.applyItemEffect = function(target, effect) {
        const item = this.item();

        // If item has dice notetag
        if (item && item.meta.Dice_mult !== undefined && DataManager.isItem(item)) {

            const multiplier = Number(item.meta.Dice_mult) || DEFAULT_MULT;
            const sides = Number(item.meta.Dice_sides) || DEFAULT_SIDES;

            // Roll the dice, see where they may fall 
            const roll = Math.floor(Math.random() * sides) + 1;
            const diceScale = multiplier * (0.5 + (roll - 1) * 0.3);

            $gameVariables.setValue(4, roll);

            switch (effect.code) {

                case Game_Action.EFFECT_RECOVER_HP:
                    // HP Recovery (percentage + flat)
                    {
                        const baseHeal = target.mhp * effect.value1 + effect.value2;
                        const result = Math.floor(baseHeal * diceScale);
                        $gameVariables.setValue(5, result);
                        target.gainHp(result);
                    }
                    break;

                case Game_Action.EFFECT_RECOVER_MP:
                    // MP Recovery (percentage + flat)
                    {
                        const baseMP = target.mmp * effect.value1 + effect.value2;
                        const result = Math.floor(baseMP * diceScale);
                        $gameVariables.setValue(5, result);
                        target.gainMp(result);
                    }
                    break;

                case Game_Action.EFFECT_ADD_STATE:
                    // Random state application influenced by dice
                    {
                        if (Math.random() < diceScale) {
                            target.addState(effect.dataId);
                        }
                    }
                    break;

                default:
                    // Any other effect uses default engine behavior
                    _Dice_applyItemEffect.call(this, target, effect);
                    break;
            }

            if (BattleManager._logWindow) {
                BattleManager._logWindow.push('addText', `A ${roll} was rolled!`);
            }

        } else {
            _Dice_applyItemEffect.call(this, target, effect);
        }
    };

})();
