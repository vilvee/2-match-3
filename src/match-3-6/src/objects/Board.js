import {
	CANVAS_HEIGHT,
	CANVAS_WIDTH,
	images,
	sounds,
	timer,
} from '../globals.js';
import Tile from './Tile.js';
import { SoundName, TileColour, TilePattern } from '../enums.js';
import {
	getRandomPositiveInteger,
	pickRandomElement,
} from '../../lib/Random.js';
import Easing from '../../lib/Easing.js';

export default class Board {
	static SIZE = 8;
	static POSITION_CENTER = {
		x: (CANVAS_WIDTH - Board.SIZE * Tile.SIZE) / 2,
		y: (CANVAS_HEIGHT - Board.SIZE * Tile.SIZE) / 2,
	};
	static POSITION_RIGHT = {
		x: (CANVAS_WIDTH - Board.SIZE * Tile.SIZE) * 0.85,
		y: (CANVAS_HEIGHT - Board.SIZE * Tile.SIZE) / 2,
	};

	/**
	 * The Board is our arrangement of Tiles with which we must try
	 * to find matching sets of three horizontally or vertically.
	 *
	 * @param {Number} x
	 * @param {Number} y
	 */
	constructor(x, y, width = Board.SIZE, height = Board.SIZE) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.matches = [];
		this.tiles = [];
		this.minimumMatchLength = 3;
		this.tileSprites = Tile.generateSprites(images);
	}

	render() {
		this.renderBoard();
	}

	// Loops through the tiles and renders them at their location.
	renderBoard() {
		for (let row = 0; row < this.height; row++) {
			for (let column = 0; column < this.width; column++) {
				this.tiles[row][column].render(this.x, this.y);
			}
		}
	}

	initializePlayBoard() {
		// Reinitialize if matches exist so we always start with a matchless board.
		do {
			this.initializeBoard();
			this.calculateMatches();
		} while (this.matches.length > 0);
	}

	initializeTitleScreenBoard() {
		this.initializeBoard();
	}

	initializeBoard() {
		this.tiles = [];

		// For each row in the board...
		for (let row = 0; row < this.height; row++) {
			// Insert a new array to represent the row.
			this.tiles.push([]);

			// For each column in the row...
			for (let column = 0; column < this.width; column++) {
				this.tiles[row].push(this.generateTile(column, row));
			}
		}
	}

	generateTile(x, y) {
		const starProbability = 0.05;
		let pattern = TilePattern.Flat;
		let isStar = false;

		if (Math.random() < starProbability) {
			pattern = TilePattern.Star;
			isStar = true;
		}
		const colourList = [
			TileColour.Beige,
			TileColour.Pink,
			TileColour.Purple,
			TileColour.LightGreen,
			TileColour.Blue,
			TileColour.Orange,
		];

		const colour = pickRandomElement(colourList);
		const patternRange = [pattern, pattern];
		const randomPattern = getRandomPositiveInteger(
			patternRange[0],
			patternRange[1]
		);


		return  new Tile(x, y, colour, randomPattern, this.tileSprites, isStar);
	}

	async swapTiles(selectedTile, highlightedTile) {
		const temporaryTile = new Tile(
			selectedTile.boardX,
			selectedTile.boardY
		);

		this.isSwapping = true;

		// Swap canvas positions by tweening so the swap is animated.
		timer.tweenAsync(
			highlightedTile,
			{ x: temporaryTile.x, y: temporaryTile.y },
			0.2,
			Easing.easeInQuad
		);
		await timer.tweenAsync(
			selectedTile,
			{ x: highlightedTile.x, y: highlightedTile.y },
			0.2,
			Easing.easeInQuad
		);

		this.isSwapping = false;

		// Swap board positions.
		selectedTile.boardX = highlightedTile.boardX;
		selectedTile.boardY = highlightedTile.boardY;
		highlightedTile.boardX = temporaryTile.boardX;
		highlightedTile.boardY = temporaryTile.boardY;

		// Swap tiles in the tiles array.
		this.tiles[selectedTile.boardY][selectedTile.boardX] = selectedTile;
		this.tiles[highlightedTile.boardY][highlightedTile.boardX] =
			highlightedTile;
	}

	/**
	 * Goes left to right, top to bottom in the board, calculating matches by
	 * counting consecutive tiles of the same color. Doesn't need to check the
	 * last tile in every row or column if the last two haven't been a match.
	 */
	calculateMatches() {
		this.matches = [];
		this.resolveHorizontalMatches();
		this.resolveVerticalMatches();
		console.log(this.matches.length);

	}

	isStar(row){
		for(let i = 0; i < row.length; i++){
			if(row[i].isStar){
				return true;
			}
		}
	}

	resolveHorizontalMatches() {
		for (let y = 0; y < Board.SIZE; y++) {
			let matchCounter = 1;
			let colourToMatch = this.tiles[y][0].colour;
			let rowMatches = [];

			// For every horizontal tile...
			for (let x = 1; x < Board.SIZE; x++) {
				// If this is the same colour as the one we're trying to match...
				if (this.tiles[y][x].colour === colourToMatch) {
					matchCounter++;
				} else {
					// Set this as the new colour we want to watch for.
					colourToMatch = this.tiles[y][x].colour;

					// If we have a match of 3 or more up until now, add it to our matches array.
					if (matchCounter >= this.minimumMatchLength) {
						const match = [];

						// Go backwards from here by matchCounter.
						for (let x2 = x - 1; x2 >= x - matchCounter; x2--) {
							// Add each tile to the match that's in that match.
							match.push(this.tiles[y][x2]);
						}

						if(this.isStar(match)){
							let matchRow = [];
							// Calculate score for entire row
							for (let x3 = 0; x3 < Board.SIZE; x3++) {
								matchRow.push(this.tiles[y][x3]);
							}

							rowMatches.push(matchRow);
						} else{
							// Add this match to our total matches array.
							rowMatches.push(match);
						}
					}

					matchCounter = 1;

					// We don't need to check last two if they won't be in a match.
					if (x >= Board.SIZE - 2) {
						break;
					}
				}
			}

			// Account for matches at the end of a row.
			if (matchCounter >= this.minimumMatchLength) {
				let match = [];

				// Go backwards from here by matchCounter.
				for (
					let x = Board.SIZE - 1;
					x >= Board.SIZE - matchCounter;
					x--
				) {
					match.push(this.tiles[y][x]);
				}

				if(this.isStar(match)){
					let matchRow = [];
					// Calculate score for entire row
					for (let x3 = 0; x3 < Board.SIZE; x3++) {
						matchRow.push(this.tiles[y][x3]);
					}

					rowMatches.push(matchRow);
				} else{
					rowMatches.push(match);
				}
			}

			// Insert matches into the board matches array.
			rowMatches.forEach((match) => this.matches.push(match));
		}
	}

	resolveVerticalMatches() {
		for (let x = 0; x < Board.SIZE; x++) {
			let matchCounter = 1;
			let colourToMatch = this.tiles[0][x].colour;
			let columnMatches = [];

			// For every vertical tile...
			for (let y = 1; y < Board.SIZE; y++) {
				// If this is the same colour as the one we're trying to match...
				if (this.tiles[y][x].colour === colourToMatch) {
					matchCounter++;
				} else {
					// Set this as the new colour we want to watch for.
					colourToMatch = this.tiles[y][x].colour;

					// If we have a match of 3 or more up until now, add it to our matches array.
					if (matchCounter >= this.minimumMatchLength) {
						const match = [];

						// Go backwards from here by matchCounter.
						for (let y2 = y - 1; y2 >= y - matchCounter; y2--) {
							// Add each tile to the match that's in that match.
							match.push(this.tiles[y2][x]);
						}

						if(this.isStar(match)){
							let matchCol = [];
							// Calculate score for entire row
							for (let y3 = 0; y3 < Board.SIZE; y3++) {
								matchCol.push(this.tiles[y3][x]);
							}

							columnMatches.push(matchCol);
						} else{

							columnMatches.push(match);
						}
					}

					matchCounter = 1;

					// We don't need to check last two if they won't be in a match.
					if (y >= Board.SIZE - 2) {
						break;
					}
				}
			}

			// Account for matches at the end of a column.
			if (matchCounter >= this.minimumMatchLength) {
				let match = [];

				// Go backwards from here by matchCounter.
				for (
					let y = Board.SIZE - 1;
					y >= Board.SIZE - matchCounter;
					y--
				) {
					match.push(this.tiles[y][x]);
				}

				if(this.isStar(match)){
					let matchCol = [];
					// Calculate score for entire row
					for (let y3 = 0; y3 < Board.SIZE; y3++) {
						matchCol.push(this.tiles[y3][x]);
					}

					columnMatches.push(matchCol);
				} else{
	
					columnMatches.push(match);
				}
			}

			// Insert matches into the board matches array.
			columnMatches.forEach((match) => this.matches.push(match));
		}
	}

	/**
	 * Remove the matches from the Board by setting the Tile slots
	 * within them to null, then setting this.matches to empty.
	 */
	removeMatches() {
		if (this.matches.length === 0) {
			return;
		}

		this.matches.forEach((match) => {
			match.forEach((tile) => {
				this.tiles[tile.boardY][tile.boardX] = null;
			});

			sounds.play(SoundName.Match);
		});

		this.matches = [];
	}

	/**
	 * Shifts down all of the tiles that now have spaces below them, then returns
	 * an array that contains tweening information for these new tiles.
	 *
	 * @returns An array containing all the tween definitions for the falling tiles.
	 */
	getFallingTiles() {
		// An array to hold the tween definitions.
		const tweens = [];

		// For each column, go up tile by tile till we hit a space.
		for (let column = 0; column < Board.SIZE; column++) {
			let space = false;
			let spaceRow = 0;
			let row = Board.SIZE - 1;

			while (row >= 0) {
				// If our last tile was a space...
				const tile = this.tiles[row][column];

				// If the current tile is *not* a space, bring this down to the lowest space.
				if (space && tile) {
					// Put the tile in the correct spot in the board and fix its grid position.
					this.tiles[spaceRow][column] = tile;
					tile.boardY = spaceRow;

					// Set its prior position to null.
					this.tiles[row][column] = null;

					// Add a tween definition to be processed later.
					tweens.push({
						tile,
						endValues: { y: tile.boardY * Tile.SIZE },
					});

					// Reset parameters so we start back from here in the next iteration.
					space = false;
					row = spaceRow;
					spaceRow = 0;
				}
				// If the current tile is a space, mark it as such.
				else if (tile === null) {
					space = true;

					if (spaceRow === 0) {
						spaceRow = row;
					}
				}

				row--;
			}
		}

		return tweens;
	}

	/**
	 * Scans the board for empty spaces and generates new tiles for each space.
	 *
	 * @returns An array containing all the tween definitions for the new tiles.
	 */
	getNewTiles() {
		const tweens = [];

		// Create replacement tiles at the top of the screen.
		for (let x = 0; x < Board.SIZE; x++) {
			for (let y = Board.SIZE - 1; y >= 0; y--) {
				// If the tile is exists, move on to the next one.
				if (this.tiles[y][x]) {
					continue;
				}

				// If the tile doesn't exist, that means it's a space that needs a new tile.
				const tile = this.generateTile(x, y);

				tile.y = -Tile.SIZE;
				this.tiles[y][x] = tile;

				// Add a tween definition to be processed later.
				tweens.push({
					tile,
					endValues: { y: tile.boardY * Tile.SIZE },
				});
			}
		}

		return tweens;
	}

	/**
	 * Automatically swap tiles for the title screen animation.
	 */
	autoSwap() {
		timer.addTask(async () => {
			// Pick initial positions that won't become out of bounds when swapping.
			const tile1Position = {
				x: getRandomPositiveInteger(1, this.height - 2),
				y: getRandomPositiveInteger(1, this.width - 2),
			};
			const tile2Position = {
				x: tile1Position.x,
				y: tile1Position.y,
			};

			// Randomly choose the second tile to be up/down/left/right of tile1.
			switch (getRandomPositiveInteger(0, 4)) {
				case 0:
					tile2Position.x++;
					break;
				case 1:
					tile2Position.x--;
					break;
				case 2:
					tile2Position.y++;
					break;
				default:
					tile2Position.y--;
					break;
			}

			const tile1 = this.tiles[tile1Position.x][tile1Position.y];
			const tile2 = this.tiles[tile2Position.x][tile2Position.y];

			if (!this.isSwapping) {
				await this.swapTiles(tile1, tile2);
			}
		}, 0.3);
	}

	showHint() {
		for (let row = 0; row < Board.SIZE; row++) {
			for (let col = 0; col < Board.SIZE; col++) {
				// Check horizontal swap
				if (col < Board.SIZE - 2) {
					if (this.checkSwapAndMatch(row, col, row, col + 1)) {
						return [this.tiles[row][col], this.tiles[row][col + 1]];
					}
				}
				// Check vertical swap
				if (row < Board.SIZE - 2) {
					if (this.checkSwapAndMatch(row, col, row + 1, col)) {
						return [this.tiles[row][col], this.tiles[row + 1][col]];
					}
				}
			}
		}
		return null;
	}

	checkSwapAndMatch(row1, col1, row2, col2) {

		const temp = this.tiles[row1][col1];
		this.tiles[row1][col1] = this.tiles[row2][col2];
		this.tiles[row2][col2] = temp;

		const foundMatch = this.isValidMatch(row1, col1) ||
						   this.isValidMatch(row2, col2);

		// Swap back the tiles
		this.tiles[row2][col2] = this.tiles[row1][col1];
		this.tiles[row1][col1] = temp;

		return foundMatch;
	}

	isValidMatch(row, col) {
		return this.isHorizontalMatch(row, col) || this.isVerticalMatch(row, col);
	}

	isHorizontalMatch(row, col) {
		const color = this.tiles[row][col].colour;
		let matchCount = 1;

		// Check to the left
		for (let c = col - 1; c >= 0 && this.tiles[row][c].colour === color; c--) {
			matchCount++;
		}

		// Check to the right
		for (let c = col + 1; c < Board.SIZE && this.tiles[row][c].colour === color; c++) {
			matchCount++;
		}

		// Return true if there are 3 or more matching tiles horizontally
		return matchCount >= 3;
	}

	isVerticalMatch(row, col) {
		const color = this.tiles[row][col].colour;
		let matchCount = 1;

		// Check upwards
		for (let r = row - 1; r >= 0 && this.tiles[r][col].colour === color; r--) {
			matchCount++;
		}

		// Check downwards
		for (let r = row + 1; r < Board.SIZE && this.tiles[r][col].colour === color; r++) {
			matchCount++;
		}

		// Return true if there are 3 or more matching tiles vertically
		return matchCount >= 3;
	}

}
