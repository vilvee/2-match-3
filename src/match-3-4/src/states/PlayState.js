import Board from '../objects/Board.js';
import { roundedRectangle } from '../../lib/Drawing.js';
import { SoundName } from '../enums.js';
import { context, keys, sounds, timer } from '../globals.js';
import State from '../../lib/State.js';
import Tile from '../objects/Tile.js';

export default class PlayState extends State {
	constructor() {
		super();

		this.board = new Board(
			Board.POSITION_CENTER.x,
			Board.POSITION_CENTER.y
		);

		// Position in the grid which we're currently highlighting.
		this.cursor = { boardX: 0, boardY: 0 };

		// Tile we're currently highlighting (preparing to swap).
		this.selectedTile = null;
	}

	update(dt) {
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

		// Remove any matches from the board to create empty spaces.
		this.board.removeMatches();

		await this.placeNewTiles();

		/**
		 * Recursively call function in case new matches have been created
		 * as a result of falling blocks once new blocks have finished falling.
		 */
		await this.calculateMatches();
	}

	async placeNewTiles() {
		// Get an array with tween values for tiles that should now fall as a result of the removal.
		const tilesToFall = this.board.getFallingTiles();

		// Tween all the falling blocks simultaneously.
		await Promise.all(
			tilesToFall.map((tile) => {
				timer.tweenAsync(tile.tile, tile.parameters, tile.endValues, 2);
			})
		);

		// Get an array with tween values for tiles that should replace the removed tiles.
		const newTiles = this.board.getNewTiles();

		// Tween the new tiles falling one by one for a more interesting animation.
		for (const tile of newTiles) {
			await timer.tweenAsync(
				tile.tile,
				tile.parameters,
				tile.endValues,
				1
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
		context.save();
		context.fillStyle = 'white';
		context.font = '15px Joystix';
		context.fillText(
			`Cursor Tile:   (${this.cursor.boardX}, ${this.cursor.boardY})`,
			10,
			20
		);
		context.fillText(
			`Selected Tile: (${
				this.selectedTile ? this.selectedTile.boardX : '_'
			}, ${this.selectedTile ? this.selectedTile.boardY : '_'})`,
			10,
			40
		);
		context.restore();
	}
}
