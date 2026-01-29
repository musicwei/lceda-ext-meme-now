// Placeholder EDA integration helpers for the iframe.
// Two strategies are provided:
// 1) If the host exposes a global function `edainsert(imageUrl, target)` (or `eda.insertImage`), call it.
// 2) Otherwise send a `postMessage` which the extension runtime (or `src/index.ts`) should listen for.

// Exported function used by search.js
window.__edaInsertImage = async function (imageUrl, target, size, blob) {
	const edaimage = await eda.pcb_MathPolygon.convertImageToComplexPolygon(blob, size.width, size.height, 0.5, 0.5, 0, 0, true, false);
	const Point = await eda.pcb_SelectControl.getCurrentMousePosition();
	eda.pcb_PrimitiveImage.create(Point.x, Point.y, edaimage, EPCB_LayerId.TOP_SILKSCREEN, size.width, size.height, 0, false, false);

	// // fallback: send postMessage (include size and blob when available)
	// const msg = { type: 'pro-api-sdk:insert-image', url: imageUrl, target };
	// if (size) msg.size = size;
	// if (blob) msg.blob = blob;
	// window.parent.postMessage(msg, '*');
};

// Also listen for acknowledgement messages if the host wants to notify iframe.
// window.addEventListener('message', (ev) => {
// if (!ev.data) return;
// if (ev.data && ev.data.type === 'pro-api-sdk:insert-result') {
// 	console.info('Insert result:', ev.data);
// 	// could update UI if needed
// }
// });
