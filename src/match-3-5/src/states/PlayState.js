import Board from '../objects/Board.js';
import { roundedRectangle } from '../../lib/Drawing.js';
import { SoundName, StateName } from '../enums.js';
import { context, keys, sounds, stateMachine, timer } from '../globals.js';
import State from '../../lib/State.js';
import Tile from '../objects/Tile.js';

export default class PlayState extends State {
	constructor() {
		super();

		this.board = new Board(Board.POSITION_RIGHT.x, Board.POSITION_RIGHT.y);

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

		/**
		 * The timer will countdown and the player must try and
		 * reach the scoreGoal before time runs out. The timer
		 * is reset when entering a new level.
		 */
		this.maxTimer = 60;
		this.timer = this.maxTimer;

		this.startTimer();
	}

	enter(parameters) {
		this.score = parameters.score;
		this.level = parameters.level;
		this.board = new Board(Board.POSITION_RIGHT.x, Board.POSITION_RIGHT.y);
		this.timer = this.maxTimer;
		this.scoreGoal *= Math.floor(this.level * this.scoreGoalScale);

		this.startTimer();
	}

	exit() {
		timer.clear();
	}

	update(dt) {
		this.checkGameOver();
		this.checkVictory();
		this.updateCursor();

		// If we've pressed enter, select or deselect the currently highlighted tile.
		if (keys.Enter) {
			keys.Enter = false;

			this.selectTile();
		}

		timer.update(dt);
	}

	render() {
		this.board.render();

		if (this.selectedTile) {
			this.renderSelectedTile();
		}

		this.renderCursor();
		this.renderUserInterface();
	}

	updateCursor() {
		let x = this.cursor.boardX;
		let y = this.cursor.boardY;

		if (keys.w) {
			keys.w = false;
			y = Math.max(0, this.cursor.boardY - 1);
			sounds.play(SoundName.Select);
		} else if (keys.s) {
			keys.s = false;
			y = Math.min(Board.SIZE - 1, this.cursor.boardY + 1);
			sounds.play(SoundName.Select);
		} else if (keys.a) {
			keys.a = false;
			x = Math.max(0, this.cursor.boardX - 1);
			sounds.play(SoundName.Select);
		} else if (keys.d) {
			keys.d = false;
			x = Math.min(Board.SIZE - 1, this.cursor.boardX + 1);
			sounds.play(SoundName.Select);
		}

		this.cursor.boardX = x;
		this.cursor.boardY = y;
	}

	async selectTile() {
		const highlightedTile =
			this.board.tiles[this.cursor.boardY][this.cursor.boardX];

		// If nothing is selected, select current tile.
		if (!this.selectedTile) {
			this.selectedTile = highlightedTile;
		}
		// Remove highlight if already selected.
		else if (this.selectedTile === highlightedTile) {
			this.selectedTile = null;
		}
		// Otherwise, do the swap.
		else {
			await this.board.swapTiles(this.selectedTile, highlightedTile);
			this.selectedTile = null;
			await this.calculateMatches();
		}
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
			return;
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
	}

	calculateScore() {
		this.board.matches.forEach((match) => {
			this.score += match.length * this.baseScore;
		});
	}

	async placeNewTiles() {
		// Get an array with tween values for tiles that should now fall as a result of the removal.
		const tilesToFall = this.board.getFallingTiles();

		// Tween all the falling blocks simultaneously.
		await Promise.all(
			tilesToFall.map((tile) => {
				timer.tweenAsync(
					tile.tile,
					tile.endValues,
					0.25
				);
			})
		);

		// Get an array with tween values for tiles that should replace the removed tiles.
		const newTiles = this.board.getNewTiles();

		// Tween the new tiles falling one by one for a more interesting animation.
		for (const tile of newTiles) {
			await timer.tweenAsync(
				tile.tile,
				tile.endValues,
				0.1
			);
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
			Board.SIZE * Tile.SIZE,
			5,
			true,
			false
		);

		context.fillStyle = 'white';
		context.font = '25px Joystix';
		context.textAlign = 'left';
		context.fillText(`Level:`, 70, this.board.y + 45);
		context.fillText(`Score:`, 70, this.board.y + 105);
		context.fillText(`Goal:`, 70, this.board.y + 165);
		context.fillText(`Timer:`, 70, this.board.y + 225);
		context.textAlign = 'right';
		context.fillText(`${this.level}`, 250, this.board.y + 45);
		context.fillText(`${this.score}`, 250, this.board.y + 105);
		context.fillText(`${this.scoreGoal}`, 250, this.board.y + 165);
		context.fillText(`${this.timer}`, 250, this.board.y + 225);
	}

	startTimer() {
		// Decrement the timer every second.
		timer.addTask(
			() => {
				this.timer--;

				if (this.timer <= 5) {
					sounds.play(SoundName.Clock);
				}
			},
			1,
			this.maxTimer
		);
	}

	checkVictory() {
		if (this.score < this.scoreGoal) {
			return;
		}

		sounds.play(SoundName.NextLevel);

		// Change to PlayState with incremented level.
		stateMachine.change(StateName.Play, {
			level: this.level + 1,
			score: this.score,
		});
	}

	checkGameOver() {
		if (this.timer > 0) {
			return;
		}

		sounds.play(SoundName.GameOver);

		// Change to GameOverState to display the score.
		stateMachine.change(StateName.GameOver, {
			score: this.score,
		});
	}
}
