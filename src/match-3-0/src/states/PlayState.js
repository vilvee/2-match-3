import Board from "../objects/Board.js";
import State from "../../lib/State.js";

export default class PlayState extends State {
	constructor() {
		super();

		this.board = new Board(Board.POSITION_CENTER.x, Board.POSITION_CENTER.y);
	}

	render() {
		this.board.render();
	}
}
