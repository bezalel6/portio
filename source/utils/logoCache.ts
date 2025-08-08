import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import terminalImage from 'terminal-image';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cache for the rendered terminal image
let cachedImageAscii: string | null = null;
let cachePromise: Promise<string | null> | null = null;
let isInitialized = false;

/**
 * Loads and caches the logo image as terminal ASCII art.
 * This function ensures the image is only rendered once and cached for all subsequent uses.
 */
export async function getLogoAscii(): Promise<string | null> {
	// If already cached, return immediately
	if (cachedImageAscii !== null) {
		return cachedImageAscii;
	}

	// If already loading, wait for the existing promise
	if (cachePromise !== null) {
		return cachePromise;
	}

	// Start loading and cache the promise to prevent multiple parallel loads
	cachePromise = loadLogoImage();
	cachedImageAscii = await cachePromise;
	isInitialized = true;
	
	return cachedImageAscii;
}

/**
 * Gets the cached logo synchronously if available
 */
export function getLogoAsciiSync(): string | null {
	return isInitialized ? cachedImageAscii : null;
}

async function loadLogoImage(): Promise<string | null> {
	try {
		// Try to find logo.png in project root
		const logoPath = path.join(__dirname, '..', '..', 'logo.png');
		
		if (!fs.existsSync(logoPath)) {
			return '';
		}

		const buffer = fs.readFileSync(logoPath);
		const ascii = await terminalImage.buffer(buffer, {
			width: 50,
			height: 40,
			preserveAspectRatio: true,
		});
		
		return ascii;
	} catch (error) {
		// Silently fail if logo can't be loaded
		return '';
	}
}

// Pre-load the logo at module initialization to ensure it's ready when needed
getLogoAscii();