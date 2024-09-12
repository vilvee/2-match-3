import Board from '../objects/Board.js';
import { roundedRectangle } from '../../lib/Drawing.js';
import { context, keys } from '../globals.js';
import State from '../../lib/State.js';
import Tile from '../objects/Tile.js';
import Cursor from '../objects/Cursor.js';

export default class PlayState extends State {
	constructor() {
		super();

		this.board = new Board(
			Board.POSITION_CENTER.x,
			Board.POSITION_CENTER.y
		);

		// Position in the grid which we're currently highlighting.
		this.cursor = new Cursor(this.board.x, this.board.y);

		// Tile we're currently highlighting (preparing to swap).
		this.selectedTile = null;
	}

	update(dt) {
		this.cursor.update(dt);

		// If we've pressed enter, select or deselect the currently highlighted tile.
		if (keys.Enter) {
			keys.Enter = false;

			this.selectTile();
		}
	}

	render() {
		this.board.render();

		if (this.selectedTile) {
			this.renderSelectedTile();
		}

		this.cursor.render();
		this.renderUserInterface();
	}

	selectTile() {
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
			this.board.swapTiles(this.selectedTile, highlightedTile);
			this.selectedTile = null;
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
