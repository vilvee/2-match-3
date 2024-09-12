import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../globals.js';
import Tile from './Tile.js';
import { TileColour, TilePattern } from '../enums.js';
import {
	getRandomPositiveInteger,
	pickRandomElement,
} from '../../lib/Random.js';

export default class Board {
	static SIZE = 8;
	static POSITION_CENTER = {
		x: (CANVAS_WIDTH - Board.SIZE * Tile.SIZE) / 2,
		y: (CANVAS_HEIGHT - Board.SIZE * Tile.SIZE) / 2,
	};

	/**
	 * The Board is our arrangement of Tiles with which we must try
	 * to find matching sets of three horizontally or vertically.
	 *
	 * @param {Number} x
	 * @param {Number} y
	 */
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.tileSprites = Tile.generateSprites();
		this.tiles = this.initializeBoard();
	}

	render() {
		// Loops through the tiles and renders them at their location.
		for (let row = 0; row < Board.SIZE; row++) {
			for (let column = 0; column < Board.SIZE; column++) {
				this.tiles[row][column].render(this.x, this.y);
			}
		}
	}

	initializeBoard() {
		const colourList = [
			TileColour.Beige,
			TileColour.Pink,
			TileColour.Purple,
			TileColour.LightGreen,
			TileColour.Blue,
			TileColour.Orange,
		];
		const patternRange = [TilePattern.Flat, TilePattern.Flat];
		const tiles = new Array();

		// For each row in the board...
		for (let row = 0; row < Board.SIZE; row++) {
			// Insert a new array to represent the row.
			tiles.push([]);

			// For each column in the row...
			for (let column = 0; column < Board.SIZE; column++) {
				const colour = pickRandomElement(colourList);
				const pattern = getRandomPositiveInteger(
					patternRange[0],
					patternRange[1]
				);
				const tile = new Tile(
					column,
					row,
					colour,
					pattern,
					this.tileSprites
				);

				tiles[row].push(tile);
			}
		}

		return tiles;
	}
}
