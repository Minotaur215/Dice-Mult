/*:
 * @target MV
 * @plugindesc Dice Roll for Skills and Items - displays roll in battle log
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
 * @desc Default multiplier for damage calculation if not specified in skill/item notetag.
 *
 * @help
 * ============================================================================
 * Notetags:
 * ============================================================================
 * <Dice_mult> - Enables dice multiplier on this skill or item.
 * <Dice_mult:X> - Optional: sets a custom multiplier for this skill/item (X = number).
 * <Dice_sides:X> - Optional: sets a custom number of sides for the dice roll (X = number).
 *
 * Example Notetags:
 * <Dice_mult>             -> uses default multiplier and dice sides
 * <Dice_mult:1.5>         -> uses multiplier 1.5
 * <Dice_sides:8>          -> uses an 8-sided dice
 *
 * The plugin automatically sets:
 *   $gameVariables.value(4) = dice roll result
 *   $gameVariables.value(5) = damage calculated
 *
 * In battle, it will display a line: "A [number] was rolled!"
 * The standard multipliers for a six sided dice ranging from 50% to 200% are calculated using this formula: 4 * attackStat * (0.5 + (roll - 1) * 0.3)
 * ============================================================================
 */

(() => {
    const pluginParams = PluginManager.parameters('DiceRollMultiplier');
    const DEFAULT_SIDES = Number(pluginParams['DefaultDiceSides'] || 6);
    const DEFAULT_MULT = Number(pluginParams['DefaultMultiplier'] || 1);

    const _Dice_Result_makeDamageValue = Game_Action.prototype.makeDamageValue;

    Game_Action.prototype.makeDamageValue = function(target, critical) {
        const item = this.item();

        if (item && item.meta.Dice_mult !== undefined) {
            const subject = this.subject();

            // Gets custom multiplier and dice sides from notetags or uses the defaults
            const multiplier = Number(item.meta.Dice_mult) || DEFAULT_MULT;
            const sides = Number(item.meta.Dice_sides) || DEFAULT_SIDES;

            // Rolls the dice, allows you to feel the fear in your enemy's eyes
            const roll = Math.floor(Math.random() * sides) + 1;
            $gameVariables.setValue(4, roll);

            // Damage calculations
            const attackStat = subject.atk;
            const damage = multiplier * 4 * attackStat * (0.5 + (roll - 1) * 0.3);
            $gameVariables.setValue(5, damage);

            // Shows a message in battle log
	if (BattleManager._logWindow) {
            BattleManager._logWindow.push('addText', `A ${roll} was rolled!`);

            return Math.max(0, Math.floor(damage));
        }

        return _Dice_Result_makeDamageValue.call(this, target, critical);
    };

})();
