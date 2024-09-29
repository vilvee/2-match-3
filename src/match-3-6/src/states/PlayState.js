import { SoundName, StateName } from '../enums.js';
import { context, input, sounds, stateMachine, timer } from '../globals.js';
import { roundedRectangle } from '../../lib/Drawing.js';
import State from '../../lib/State.js';
import Board from '../objects/Board.js';
import Tile from '../objects/Tile.js';
import Input from '../../lib/Input.js';

export default class PlayState extends State {
	constructor() {
		super();

		// Position in the grid which we're currently highlighting.
		this.cursor = { boardX: 0, boardY: 0 };

		// Tile we're currently highlighting (preparing to swap).
		this.selectedTile = null;

		this.level = 1;

		// Increases as the player makes matches.
		this.score = 0;

		// Score we have to reach to get to the next level.
		this.scoreGoal = 250;

		// How much score will be incremented by per match tile.
		this.baseScore = 5;

		// How much scoreGoal will be scaled by per level.
		this.scoreGoalScale = 1.25;

		this.hint = null;
		this.hintCount = 0;
		this.hintTiles =[];

		/**
		 * The timer will countdown and the player must try and
		 * reach the scoreGoal before time runs out. The timer
		 * is reset when entering a new level.
		 */
		this.maxTimer = 60;
		this.timer = this.maxTimer;
		this.extraTimePerTile = 1;
	}

	enter(parameters) {
		this.board = parameters.board;
		this.score = parameters.score;
		this.level = parameters.level;
		this.scene = parameters.scene;
		this.timer = this.maxTimer;
		this.scoreGoal *= Math.floor(this.level * this.scoreGoalScale);

		this.startTimer();
	}

	exit() {
		timer.clear();
		sounds.pause(SoundName.Music3);
	}

	update(dt) {
		this.scene.update(dt);
		this.checkGameOver();
		this.checkVictory();
		this.updateCursor();

		// If we've pressed enter, select or deselect the currently highlighted tile.
		if (input.isKeyPressed(Input.KEYS.ENTER) && !this.board.isSwapping) {
			this.selectTile();
		}

		if (input.isKeyPressed(Input.KEYS.H) && !this.board.isSwapping) {
			this.hint = true;
			this.hintCount ++;
			this.showHint();
		}

		timer.update(dt);
	}

	render() {
		this.scene.render();
		this.board.render();

		if (this.selectedTile) {
			this.renderSelectedTile();
		}

		if (this.hint) {
			this.renderHint(this.hintTiles[0], this.hintTiles[1]);
		}

		this.renderCursor();
		this.renderUserInterface();
	}

	showHint() {
		this.hintTiles = [];
		// Call the board's showHint method
		const hints = this.board.showHint();

		for (const hint of hints) {
			this.hintTiles.push(hint);
			console.log(hint)
		};
	}


	renderHint(tile1, tile2) {
		context.save();
		context.strokeStyle = 'yellow';
		context.lineWidth = 4;

		const x1 = tile1.boardX * Tile.SIZE + this.board.x;
		const y1 = tile1.boardY * Tile.SIZE + this.board.y;
		const x2 = tile2.boardX * Tile.SIZE + this.board.x;
		const y2 = tile2.boardY * Tile.SIZE + this.board.y;

		roundedRectangle(
			context,
			x1,
			y1,
			Tile.SIZE,
			Tile.SIZE
		);

		roundedRectangle(
			context,
			x2,
			y2,
			Tile.SIZE,
			Tile.SIZE
		);
		context.restore();
	}



	updateCursor() {
		let x = this.cursor.boardX;
		let y = this.cursor.boardY;

		if (input.isKeyPressed(Input.KEYS.W)) {
			y = Math.max(0, y - 1);
			sounds.play(SoundName.Select);
		} else if (input.isKeyPressed(Input.KEYS.S)) {
			y = Math.min(Board.SIZE - 1, y + 1);
			sounds.play(SoundName.Select);
		} else if (input.isKeyPressed(Input.KEYS.A)) {
			x = Math.max(0, x - 1);
			sounds.play(SoundName.Select);
		} else if (input.isKeyPressed(Input.KEYS.D)) {
			x = Math.min(Board.SIZE - 1, x + 1);
			sounds.play(SoundName.Select);
		}

		this.cursor.boardX = x;
		this.cursor.boardY = y;
	}

	selectTile() {
		const highlightedTile =
			this.board.tiles[this.cursor.boardY][this.cursor.boardX];

		/**
		 * The `?.` syntax is called "optional chaining" which allows you to check
		 * a property on an object even if that object is `null` at the time.
		 *
		 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining
		 */
		const tileDistance =
			Math.abs(this.selectedTile?.boardX - highlightedTile.boardX) +
			Math.abs(this.selectedTile?.boardY - highlightedTile.boardY);

		// If nothing is selected, select current tile.
		if (!this.selectedTile) {
			this.selectedTile = highlightedTile;
		}
		// Remove highlight if already selected.
		else if (this.selectedTile === highlightedTile) {
			this.selectedTile = null;
		} else if (tileDistance > 1) {
			/**
			 * If the difference between X and Y combined of this selected
			 * tile vs the previous is not equal to 1, also remove highlight.
			 */
			sounds.play(SoundName.Error);
			this.selectedTile = null;
		}
		// Otherwise, do the swap, and check for matches.
		else {
			this.swapTiles(highlightedTile);
		}
	}

	async swapTiles(highlightedTile) {
		// Swap tiles
		await this.board.swapTiles(this.selectedTile, highlightedTile);
		const hasMatch =  await this.calculateMatches();

		if (!hasMatch) {
			// If no match, revert the swap
			sounds.play(SoundName.Error); 
			await this.flashInvalidSwap(this.selectedTile, highlightedTile);
			await this.board.swapTiles(this.selectedTile, highlightedTile);
		} else {
			this.hint = false;
		}

		// Deselect the tile after the swap
		this.selectedTile = null;
	}

	async flashInvalidSwap(tile1, tile2) {
		const flashColor = 'rgba(255, 0, 0, 0.5)';
		for (let i = 0; i < 2; i++) {
			this.highlightTile(tile1, flashColor);
			this.highlightTile(tile2, flashColor);
			await timer.wait(0.1);

			// Reset the highlight
			this.highlightTile(tile1, null);
			this.highlightTile(tile2, null);
			await timer.wait(0.1);
		}
	}

	highlightTile(tile, color) {
		if (color) {
			context.save();
			context.fillStyle = color;
			roundedRectangle(
				context,
				tile.x + this.board.x,
				tile.y + this.board.y,
				Tile.SIZE,
				Tile.SIZE,
				10,
				true,
				false
			);
			context.restore();
		} else {
			tile.render(this.board.x, this.board.y);
		}
	}


	renderSelectedTile() {
		context.save();
		context.fillStyle = 'rgb(255, 255, 255, 0.5)';
		roundedRectangle(
			context,
			this.selectedTile.x + this.board.x,
			this.selectedTile.y + this.board.y,
			Tile.SIZE,
			Tile.SIZE,
			10,
			true,
			false
		);
		context.restore();
	}

	renderCursor() {
		context.save();
		context.strokeStyle = 'white';
		context.lineWidth = 4;

		// Use board position * Tile.SIZE so that the cursor doesn't get tweened during a swap.
		roundedRectangle(
			context,
			this.cursor.boardX * Tile.SIZE + this.board.x,
			this.cursor.boardY * Tile.SIZE + this.board.y,
			Tile.SIZE,
			Tile.SIZE
		);
		context.restore();
	}

	renderUserInterface() {
		context.fillStyle = 'rgb(56, 56, 56, 0.9)';
		roundedRectangle(
			context,
			50,
			this.board.y,
			225,
			Board.SIZE * Tile.SIZE ,
			5,
			true,
			false
		);

		context.fillStyle = 'white';
		context.font = '25px Joystix';
		context.textAlign = 'left';
		context.fillText(`Level:`, 70, this.board.y + 35);
		context.fillText(`Score:`, 70, this.board.y + 80);
		context.fillText(`Goal:`, 70, this.board.y + 125);
		context.fillText(`Timer:`, 70, this.board.y + 170);
		context.fillText(`Hints:`, 70, this.board.y + 215);
		context.textAlign = 'right';
		context.fillText(`${this.level}`, 250, this.board.y + 35);
		context.fillText(`${this.score}`, 250, this.board.y + 80);
		context.fillText(`${this.scoreGoal}`, 250, this.board.y + 125);
		context.fillText(`${this.timer}`, 250, this.board.y + 170);
		context.fillText(`${this.hintCount}`, 250, this.board.y + 215);
	}

	/**
	 * Calculates whether any matches were found on the board and tweens the needed
	 * tiles to their new destinations if so. Also removes tiles from the board that
	 * have matched and replaces them with new randomized tiles, deferring most of this
	 * to the Board class.
	 */
	async calculateMatches() {
		// Get all matches for the current board.
		this.board.calculateMatches();

		// If no matches, then no need to proceed with the function.
		if (this.board.matches.length === 0) {
			return false;
		}

		this.calculateScore();

		// Remove any matches from the board to create empty spaces.
		this.board.removeMatches();

		await this.placeNewTiles();

		/**
		 * Recursively call function in case new matches have been created
		 * as a result of falling blocks once new blocks have finished falling.
		 */
		await this.calculateMatches();
		return true;
	}

	calculateScore() {
		this.board.matches.forEach((match) => {
			let score = 0;
			let tilesInMatch = match.length;

			match.forEach((tile) => {
				if (tile.isStar) {
					score += 30;
				} else {
					score += this.baseScore;
				}
			});
			this.score += score;
			const timeReward = tilesInMatch * this.extraTimePerTile;
			this.timer = Math.min(this.maxTimer, this.timer + timeReward);
		});
	}


	async placeNewTiles() {
		// Get an array with tween values for tiles that should now fall as a result of the removal.
		const tilesToFall = this.board.getFallingTiles();

		// Tween all the falling blocks simultaneously.
		await Promise.all(
			tilesToFall.map((tile) => {
				timer.tweenAsync(tile.tile, tile.endValues, 0.25);
			})
		);

		// Get an array with tween values for tiles that should replace the removed tiles.
		const newTiles = this.board.getNewTiles();

		// Tween the new tiles falling one by one for a more interesting animation.
		for (const tile of newTiles) {
			await timer.tweenAsync(tile.tile, tile.endValues, 0.1);
		}
	}

	startTimer() {
		// Decrement the timer every second.
		timer.addTask(() => {
			this.timer--;

			if (this.timer <= 5) {
				sounds.play(SoundName.Clock);
			}
		}, 1);
	}

	checkVictory() {
		if (this.score < this.scoreGoal) {
			return;
		}
		
		this.selectedTile = null;
		this.hint = false;
		sounds.play(SoundName.NextLevel);

		stateMachine.change(StateName.LevelTransition, {
			level: this.level + 1,
			score: this.scoreGoal,
			scene: this.scene,
		});
	}

	checkGameOver() {
		if (this.timer > 0) {
			return;
		}

		sounds.play(SoundName.GameOver);

		stateMachine.change(StateName.GameOver, {
			score: this.score,
			scene: this.scene,
		});
	}
}
