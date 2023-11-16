import TerrainGenerator from './triludo/TerrainGenerator.js';

const BASE_COLOR = [30, 30, 30]; // Dino: LIGHT_GREEN
const COLOR2 = [10, 10, 40];
const COLOR3 = [10, 20, 20];
const COLOR4 = [60, 60, 60];
const GRID_COLOR = [100, 200, 200];
const GRID_LOW_COLOR = [170, 100, 170]; // [200, 100, 200];

const GRID_COLOR_SPACING = 150;

export default class DinoTerrainGenerator extends TerrainGenerator {
	calcTerrainHeight(xP, y) {
		// return 0;
		const x = xP + 120;
		const noiseScale = 0.002;
		// const noiseScale = 0.0002;
		const minHeight = 0;
		const maxHeight = 2000;
		// const delta = maxHeight - minHeight;
		let h = 100;
		// Add big heights
		h += TerrainGenerator.calcNoiseHeight(x, y, 0.0002, 800);
		h = TerrainGenerator.clamp(h, minHeight, maxHeight);
		// Pokey mountains
		h += TerrainGenerator.calcNoiseHeight(x, y, 0.0008, 600);

		// const roll = TerrainGenerator.calcNoiseHeight(x, y, 0.00015, 1);
		// if (roll)
		h = TerrainGenerator.clamp(h, minHeight, maxHeight);

		// Add roughness
		const roughness = (h <= 2) ? 20 : 50 * (h / maxHeight);
		h += TerrainGenerator.calcNoiseHeight(x, y, 0.002, roughness);

		// Add ripples (negative for erosion)
		h -= 20 * (
			1 + Math.sin(noiseScale * x + 10 * TerrainGenerator.perlinNoise(noiseScale * x, noiseScale * 2 * y, 0))
		);
		h = TerrainGenerator.clamp(h, minHeight, maxHeight);
		// h += TerrainGenerator.calcNoiseHeight(x, y, 0.00021, 200);
		// this.validateNumbers({ h, h2 });
		return h;
	}

    getTerrainTextureColor(worldX, worldY) {
		if (worldX === 0 && worldY > 0) return [255, 255, 255];
		if (worldY === 0 && worldX > 0) return [0, 255, 0];
		if (worldX === 0 || worldY === 0) return [0, 0, 255];
		// if (worldX === worldY) return [255, 255, 255];
		// if (worldX === -worldY) return [255, 255, 0];
		// if (worldX < 100 && worldX > -100 && worldY < 100 && worldY > -100) return [255, 0, 0];
		let color = BASE_COLOR;
		// TODO: Remove * 2 below
		// TODO: Add in some other noise randomness
		// const h = Math.round(this.calcTerrainHeight(worldX * 2, worldY * 2));
		const h = Math.round(this.calcTerrainHeight(worldX, worldY));

		// console.log(worldX, worldY, worldX % 10);
		if (worldX % GRID_COLOR_SPACING === 0 || worldY % GRID_COLOR_SPACING === 0) {
			if (h < 3) return GRID_LOW_COLOR;
			return GRID_COLOR;
		}
		// if (worldY > 0) return [0, 0, 200];

		// if (h > 10 && h < 14) return [150, 200, 200]; // coastal splash line
		
		if (h > 400) {
			color = COLOR4;
		} else if (h > 300) {
			color = (h % 2 === 0) ? COLOR4 : COLOR3;
		} else if (h > 250) {
			color = (h % 4 === 0) ? BASE_COLOR : COLOR3;
		} else if (h > 150) {
			color = (h % 2 === 0) ? BASE_COLOR : COLOR3;
		} else if (h > 1) {
			color = (h % 5 === 0) ? BASE_COLOR : COLOR2;
		}
		return color;
	}
};
