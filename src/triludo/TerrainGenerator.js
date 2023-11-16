// TODO: Need to remove everything that's not generic: height calculation and texture calculation
/* eslint-disable class-methods-use-this */
import { PseudoRandomizer, ArrayCoords, clamp } from 'rocket-boots';
import noise from 'noise-esm';

const { X, Y } = ArrayCoords;

const UNITS_PER_METER = 20;

class TerrainGenerator {
	constructor() {
		const todaysSeed = PseudoRandomizer.getPseudoRandInt(Number(new Date()), 1000);
		this.seed = todaysSeed;
		// Sizes are measured in integer "units"
		// 20 units = 1m = 100cm
		// 1 unit = 5cm
		this.unitsPerMeter = UNITS_PER_METER;
		// A chunk with size of 128m is roughly the size of ~10 houses.
		// A collection of 3x3 chunks would be 384m, larger than a nyc city block (274m)
		this.chunkSizeMeters = 128;
		this.chunkSize = this.unitsPerMeter * this.chunkSizeMeters; // 2560 units
		this.halfChunkSize = this.chunkSize / 2;
		this.terrainSegmentSize = 32; // 10; // (originally 10; 256 works for testing)
		this.terrainSegmentsPerChunk = this.chunkSize / this.terrainSegmentSize; // 80
		// Segements: 2560/10 = 256, 2560/20 = 128, 2560/32 = 80, 2560/256 = 10
		// While the segments break up the chunk into various triangles, each side
		// of the terrain has +1 vertex compared to the # of segments
		this.terrainChunkVertexSize = this.terrainSegmentsPerChunk + 1;
		this.terrainChunksCache = {};
		this.terrainColor = '#808095'; // dino: '#76c379';
	}

	static clamp(...args) { return clamp(...args); }

	static perlinNoise(...args) {
		if (args.length >= 3) return noise.perlin3(...args);
		return noise.perlin2(...args);
	}

	validateNumbers(objOfValues, ...args) {
		Object.keys(objOfValues).forEach((key) => {
			const n = objOfValues[key];
			if (typeof n !== 'number' || Number.isNaN(n)) {
				console.error(args);
				throw new Error(`${key} is not a number`);
			}
		});
	}

	static calcNoiseHeight(x, y, noiseScale, altitudeScale = 1) {
		return altitudeScale * noise.perlin2(noiseScale * x, noiseScale * y);
	}

	/** This is where the magic happens. This function is meant to be overriden */
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
		h = clamp(h, minHeight, maxHeight);
		// Pokey mountains
		h += TerrainGenerator.calcNoiseHeight(x, y, 0.0008, 600);

		// const roll = TerrainGenerator.calcNoiseHeight(x, y, 0.00015, 1);
		// if (roll)
		h = clamp(h, minHeight, maxHeight);

		// Add roughness
		const roughness = (h <= 2) ? 20 : 50 * (h / maxHeight);
		h += TerrainGenerator.calcNoiseHeight(x, y, 0.002, roughness);

		// Add ripples (negative for erosion)
		h -= 20 * (
			1 + Math.sin(noiseScale * x + 10 * noise.perlin3(noiseScale * x, noiseScale * 2 * y, 0))
		);
		h = clamp(h, minHeight, maxHeight);
		// h += TerrainGenerator.calcNoiseHeight(x, y, 0.00021, 200);
		// this.validateNumbers({ h, h2 });
		return h;
	}

	getTerrainHeight(x, y) {
		return this.calcTerrainHeight(x, y);
	}

	getChunkCoord(n) {
		this.validateNumbers({ n }, 'getChunkCoord');
		// const round = (n < 0) ? Math.ceil : Math.floor;
		return Math.round(n / this.chunkSize);
	}

	/** Get chunk-level x,y,z coordinates from world x,y,z coordinates */
	getChunkCoords(coords) {
		const x = this.getChunkCoord(coords[X]);
		const y = this.getChunkCoord(coords[Y]);
		const z = 0; // right now we don't do chunking up/down
		return [x, y, z];
	}

	getChunkTopLeftCoords(chunkCoords) {
		const center = this.getChunkCenterCoords(chunkCoords);
		return [center[X] - this.halfChunkSize, center[Y] + this.halfChunkSize, 0];
	}

	getChunkCenterCoords(chunkCoords) {
		if (!chunkCoords) throw new Error();
		const centerX = chunkCoords[X] * this.chunkSize;
		const centerY = chunkCoords[Y] * this.chunkSize;
		return [centerX, centerY, 0];
	}

	getChunkId(chunkCoords) {
		if (!chunkCoords) throw new Error();
		return `terrain-chunk-${chunkCoords.join(',')}`;
	}

	makeChunkCanvas(size) {
		const canvas = document.createElement('canvas');
		canvas.width = size * 1;
		canvas.height = size * 1;
		const ctx = canvas.getContext('2d');
		return { canvas, ctx };
	}

	/** This is meant to be overriden */
	getTerrainTextureColor(worldX, worldY) {
		if (worldX === 0 && worldY > 0) return [255, 255, 255];
		if (worldY === 0 && worldX > 0) return [0, 255, 0];
		if (worldX === 0 || worldY === 0) return [0, 0, 255];
		// if (worldX === worldY) return [255, 255, 255];
		// if (worldX === -worldY) return [255, 255, 0];
		// if (worldX < 100 && worldX > -100 && worldY < 100 && worldY > -100) return [255, 0, 0];
		return [100, 100, 100];
	}

	getTextureSetupData() {
		const INDEX_PER_PIXEL = 4;
		const width = 256;
		const height = 256;
		const stepSize = this.chunkSize / 256;
		const array = new Uint8Array(width * height * INDEX_PER_PIXEL);
		return { INDEX_PER_PIXEL, array, width, height, stepSize };
	}

	static getSetColorFunction(data = []) {
		return (i, [r, g, b]) => {
			data[i] = clamp(r, 0, 255);
			data[i + 1] = clamp(g, 0, 255);
			data[i + 2] = clamp(b, 0, 255);
			data[i + 3] = 255;
		};
	}

	makeTerrainTextureData(topLeft) {
		const {
			array,
			width,
			height,
			INDEX_PER_PIXEL,
			stepSize,
		} = this.getTextureSetupData();
		const data = array;
		const setColor = TerrainGenerator.getSetColorFunction(data);
		
		for (let y = 0; y < height; y += 1) {
			const yi = y * width * INDEX_PER_PIXEL;
			const yFix = 256 - y;
			for (let x = 0; x < width; x += 1) {
				const i = (x * INDEX_PER_PIXEL) + yi;
				// let [worldX, worldY] = this.convertToWorldXY(x, y, topLeft, stepSize);
				const [worldX, worldY] = this.convertToWorldXY(x, yFix, topLeft, stepSize);
				
				// const worldX = topLeft[X] + (x * stepSize);
				// const worldY = topLeft[Y] + ((y - 256) * stepSize);
				const color = this.getTerrainTextureColor(worldX, worldY);
				setColor(i, color);
			}
		}

		// for (let i = 0; i < data.length; i += INDEX_PER_PIXEL) {
		// 	const i4 = i / 4;
		// 	const x = Math.floor(i4) % width;
		// 	const y = Math.floor(i4 / width);
		// 	const [worldX, worldY] = this.convertToWorldXY(x, y, topLeft, stepSize);
		// 	// ^ This conversion is not working quite right - TODO: Fix this
		// 	const color = this.getTerrainTextureColor(worldX, worldY);
		// 	setColor(i, color);
		// }
		return data;
	}

	convertToWorldXY(stepX, stepY, topLeft, stepSize) {
		const worldX = topLeft[X] + (stepX * stepSize);
		const worldY = topLeft[Y] - (stepY * stepSize);
		return [worldX, worldY];
	}

	makeTerrainChunk(chunkCoords) {
		if (!chunkCoords) throw new Error('makeTerrainChunk missing chunkCoords');
		const debug = [];
		const heights = [];
		const topLeft = this.getChunkTopLeftCoords(chunkCoords);
		const center = this.getChunkCenterCoords(chunkCoords);
		const chunkId = this.getChunkId(chunkCoords);
		const dataSize = this.terrainChunkVertexSize;
		const { canvas, ctx } = this.makeChunkCanvas(dataSize);
		// x and y here are steps along the terrain segments, not actual world x,y coordinates
		let x;
		let y;

		// const textureData = this.getTextureSetupData().array;
		// const setColor = TerrainGenerator.getSetColorFunction(textureData);

		for (y = 0; y < dataSize; y += 1) {
			if (!heights[y]) heights[y] = [];
			if (!debug[y]) debug[y] = [];
			for (x = 0; x < dataSize; x += 1) {
				// Convert the x, y steps to actual world x, y
				// const convSize = this.terrainSegmentSize;
				// const worldX = topLeft[X] + (x * convSize);
				// const worldY = topLeft[Y] - (y * convSize);
				const [worldX, worldY] = this.convertToWorldXY(x, y, topLeft, this.terrainSegmentSize);
				this.validateNumbers({ worldX, worldY });
				const h = this.calcTerrainHeight(worldX, worldY);
				// if (y === 0) console.log('y = 0', x, h);
				heights[y][x] = h;
				// console.log('step x,y', x, y, '--> world', worldX, worldY, 'h', h);
				// if( x > 10) throw new Error();
				const hmh = Math.min(Math.max(Math.round(h), 0), 255);
				ctx.fillStyle = `rgba(${hmh},${hmh},${hmh},1)`;
				// if (Math.round(worldX) < 1) ctx.fillStyle = `rgba(255,${hmh},${hmh},1)`;
				// if (Math.round(worldY) < 1) ctx.fillStyle = `rgba(255,255,${hmh},1)`;
				// ctx.fillStyle = `rgb(${hmh},${hmh},${hmh})`;
				// ctx.fillRect(x * 2, y * 2, 2, 2);
				ctx.fillRect(x * 1, y * 1, 1, 1);

				// const i = (y * 256) + X;
				// setColor(i, this.getTerrainTextureColor(worldX, worldY));
			}
		}
		const image = new Image();
		image.src = canvas.toDataURL();
		// This is beyond stupid, but the image is somehow not loaded
		// even though we just created it and populated it synchronously.
		// So we have to wait for the image to load...
		// const waitForImage = (img) => (
		// 	new Promise((resolve, reject) => {
		// 		img.onload = resolve;
		// 		img.onerror = reject;
		// 	})
		// );
		// console.log(image.complete);
		// await waitForImage(image);
		// console.log(image.complete);

		const textureData = this.makeTerrainTextureData(topLeft);

		// document.getElementById('map').innerHTML = '';
		// document.getElementById('map').appendChild(image);

		// Returns a "chunk" object
		return {
			color: this.terrainColor, // (chunkCoords[X] - chunkCoords[Y] === 0) ? 0x55ffbb : 0x66eeaa,
			// textureImage,
			textureData,
			heightMapImage: image,
			image,
			heights,
			entityId: chunkId,
			center,
			size: this.chunkSize,
			segments: this.terrainSegmentsPerChunk,
			vertexDataSize: dataSize,
		};
	}

	addNewTerrainChunk(chunkCoords) {
		const chunkId = this.getChunkId(chunkCoords);
		// Get it from cache if its already been created
		if (this.terrainChunksCache[chunkId]) return this.terrainChunksCache[chunkId];
		// Otherwise create it
		const chunk = this.makeTerrainChunk(chunkCoords);
		// ...and cache it
		this.terrainChunksCache[chunk.entityId] = chunk;
		return chunk;
	}

	makeTerrainChunks(coords, chunkRadius = 1) {
		if (!coords) throw new Error('Missing coords param');
		const centerChunkCoords = this.getChunkCoords(coords);
		// const centerChunk = this.addNewTerrainChunk(centerChunkCoords);
		// return [centerChunk];
		const chunks = [];
		const MAX = Math.round(chunkRadius);
		const MIN = -MAX;
		for (let x = MIN; x <= MAX; x += 1) {
			for (let y = MIN; y <= MAX; y += 1) {
				const newChunkCoords = ArrayCoords.add(centerChunkCoords, [x, y, 0]);
				const chunk = this.addNewTerrainChunk(newChunkCoords);
				chunks.push(chunk);
			}
		}
		return chunks;
	}
}

export default TerrainGenerator;
