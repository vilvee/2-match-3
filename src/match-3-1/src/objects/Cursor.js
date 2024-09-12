import { roundedRectangle } from '../../lib/Drawing.js';
import { SoundName } from '../enums.js';
import { context, keys, sounds } from '../globals.js';
import Board from './Board.js';
import Tile from './Tile.js';

export default class Cursor {
	/**
	 * The rectangle that shows the player which
	 * tile they are currently hovering over.
	 *
	 * @param {number} x
	 * @param {number} y
	 * @param {string} colour
	 * @param {number} lineWidth
	 */
	constructor(x, y, colour = 'white', lineWidth = 4) {
		// Board position.
		this.boardX = 0;
		this.boardY = 0;

		// Canvas position.
		this.x = x;
		this.y = y;

		this.colour = colour;
		this.lineWidth = lineWidth;
	}

	update(dt) {
		this.moveCursor();
	}

	render() {
		context.save();
		context.strokeStyle = this.colour;
		context.lineWidth = this.lineWidth;

		roundedRectangle(
			context,
			this.boardX * Tile.SIZE + this.x,
			this.boardY * Tile.SIZE + this.y,
			Tile.SIZE,
			Tile.SIZE
		);
		context.restore();
	}

	moveCursor() {
		if (keys.w) {
			keys.w = false;
			this.boardY = Math.max(0, this.boardY - 1);
			sounds.play(SoundName.Select);
		} else if (keys.s) {
			keys.s = false;
			this.boardY = Math.min(Board.SIZE - 1, this.boardY + 1);
			sounds.play(SoundName.Select);
		} else if (keys.a) {
			keys.a = false;
			this.boardX = Math.max(0, this.boardX - 1);
			sounds.play(SoundName.Select);
		} else if (keys.d) {
			keys.d = false;
			this.boardX = Math.min(Board.SIZE - 1, this.boardX + 1);
			sounds.play(SoundName.Select);
		}
	}
}
