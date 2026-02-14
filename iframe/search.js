async function edaInsertImage(size, blob, invert, colorful, opts = {}) {
	const tolerance = typeof opts.tolerance === 'number' ? opts.tolerance : 0;
	const simplification = typeof opts.simplification === 'number' ? opts.simplification : 0;
	const smoothing = typeof opts.smoothing === 'number' ? opts.smoothing : 0;
	const despeckling = typeof opts.despeckling === 'number' ? opts.despeckling : 0;
	const whiteAsBackgroundColor = typeof opts.whiteAsBackgroundColor === 'boolean' ? opts.whiteAsBackgroundColor : true;

	if (colorful) {
		// blob转base64
		Base64string = await new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				resolve(reader.result);
			};
			reader.onerror = (err) => {
				reject(err);
			};
			reader.readAsDataURL(blob);
		});
		eda.sys_Message.showToastMessage('请单击放置', 'info', 3);
		// console.log('开始插入');

		eda.pcb_Event.addMouseEventListener(
			'put',
			'selected',
			async () => {
				const Point = await eda.pcb_SelectControl.getCurrentMousePosition();

				eda.pcb_PrimitiveObject.create(
					EPCB_LayerId.TOP_SILKSCREEN,
					Point.x,
					Point.y,
					Base64string,
					size.width,
					size.height,
					0,
					false,
					'img',
					false,
				);
			},
			true,
		);
	} else {
		const edaimage = await eda.pcb_MathPolygon.convertImageToComplexPolygon(
			blob,
			size.width,
			size.height,
			tolerance,
			simplification,
			smoothing,
			despeckling,
			whiteAsBackgroundColor,
			invert,
		);
		eda.sys_Message.showToastMessage('请单击放置', 'info', 3);
		// console.log('开始插入');

		eda.pcb_Event.addMouseEventListener(
			'put',
			'selected',
			async () => {
				const Point = await eda.pcb_SelectControl.getCurrentMousePosition();

				eda.pcb_PrimitiveImage.create(Point.x, Point.y, edaimage, EPCB_LayerId.TOP_SILKSCREEN, size.width, size.height, 0, false, false);
			},
			true,
		);
	}
}
// 使用注册的 id 每分钟10次调用
async function searchApihzMemes(query, limit = 24) {
	if (!query) return [];
	const endpoint = 'https://cn.apihz.cn/api/img/apihzbqbbaidu.php';
	const params = new URLSearchParams({
		id: '10012391',
		key: '11a373510c901448996bb3a3801c2bc7',
		limit: String(limit),
		page: '1',
		words: query,
	});
	const url = `${endpoint}?${params}`;
	const res = await fetch(url, { mode: 'cors' });
	if (!res.ok) throw new Error('apihz request failed');
	const data = await res.json();
	if (!data || !data.res || !Array.isArray(data.res)) return [];
	return data.res.slice(0, limit).map((u, i) => ({
		title: `${query} #${i + 1}`,
		thumbUrl: u,
		fullUrl: u,
	}));
}

// tangdou API 存在跨域访问问题 ，与开发者尚未沟通成功
async function searchTangdouMemes(query, limit = 24) {
	if (!query) return [];
	const endpoint = 'https://api.tangdouz.com/a/biaoq.php';
	const params = new URLSearchParams({ return: 'json', nr: query });
	const url = `${endpoint}?${params}`;
	const res = await fetch(url, { mode: 'cors' });
	if (!res.ok) throw new Error('tangdou request failed');
	const data = await res.json();
	if (!data) return [];
	// data shape may vary; try to find array of items
	let items = [];
	if (Array.isArray(data)) items = data;
	else if (Array.isArray(data.data)) items = data.data;
	else if (Array.isArray(data.list)) items = data.list;
	else if (typeof data === 'object') items = Object.values(data).filter((v) => v && typeof v === 'object');

	const out = items
		.filter((it) => it && (it.thumbSrc || it.thumb_src || it.src))
		.slice(0, limit)
		.map((it, i) => ({
			title: it.title || `${query} #${i + 1}`,
			thumbUrl: it.thumbSrc || it.thumb_src || it.src,
			fullUrl: it.thumbSrc || it.thumb_src || it.src,
		}));
	return out;
}

document.addEventListener('DOMContentLoaded', () => {
	const qEl = document.getElementById('query');
	const btn = document.getElementById('search');
	const resultsEl = document.getElementById('results');
	const status = document.getElementById('status');
	const emojiPickerEl = document.getElementById('emoji-picker');
	const insertBtn = document.getElementById('insert');
	const invertEl = document.getElementById('invert');
	const colorfulEl = document.getElementById('colorful');
	if (!qEl || !btn || !resultsEl || !status || !insertBtn) {
		return;
	}

	/* 后续加入高级选项，调试丝印生成细节
	(function addDebugControls() {
		const existing = document.getElementById('debug-controls');
		if (existing) return;
		const panel = document.createElement('div');
		panel.id = 'debug-controls';
		panel.style.cssText =
			'margin:8px 0;padding:8px;border:1px dashed #bbb;font-size:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;';

		function labeledInput(labelText, input) {
			const wrapper = document.createElement('label');
			wrapper.style.display = 'flex';
			wrapper.style.alignItems = 'center';
			wrapper.style.gap = '6px';
			const span = document.createElement('span');
			span.textContent = labelText;
			span.style.minWidth = '90px';
			wrapper.appendChild(span);
			wrapper.appendChild(input);
			return wrapper;
		}

		const tol = document.createElement('input');
		tol.type = 'number';
		tol.id = 'dbg-tolerance';
		tol.step = '0.1';
		tol.min = '0';
		tol.value = '0.5';

		const simp = document.createElement('input');
		simp.type = 'number';
		simp.id = 'dbg-simplification';
		simp.step = '1';
		simp.min = '0';
		simp.value = '0';

		const smooth = document.createElement('input');
		smooth.type = 'number';
		smooth.id = 'dbg-smoothing';
		smooth.step = '1';
		smooth.min = '0';
		smooth.value = '0';

		const despeck = document.createElement('input');
		despeck.type = 'number';
		despeck.id = 'dbg-despeckling';
		despeck.step = '1';
		despeck.min = '0';
		despeck.value = '0';

		const whiteBg = document.createElement('input');
		whiteBg.type = 'checkbox';
		whiteBg.id = 'dbg-white-bg';
		whiteBg.checked = true;

		const scaleIn = document.createElement('input');
		scaleIn.type = 'number';
		scaleIn.id = 'dbg-scale';
		scaleIn.step = '0.5';
		scaleIn.min = '1';
		scaleIn.value = '2';

		panel.appendChild(labeledInput('tolerance', tol));
		panel.appendChild(labeledInput('simplification', simp));
		panel.appendChild(labeledInput('smoothing', smooth));
		panel.appendChild(labeledInput('despeckling', despeck));
		panel.appendChild(labeledInput('whiteBg', whiteBg));
		panel.appendChild(labeledInput('scale', scaleIn));

		// insert panel after status element
		if (status && status.parentNode) status.parentNode.insertBefore(panel, status.nextSibling);
	})(); 
	*/
	let selected = null;

	// 选择彩色时，反色选项自动取消并禁用
	if (colorfulEl && invertEl) {
		colorfulEl.addEventListener('change', () => {
			if (colorfulEl.checked) {
				invertEl.checked = false;
				invertEl.disabled = true;
			} else {
				invertEl.disabled = false;
			}
		});
	}

	if (colorfulEl && invertEl) {
		invertEl.addEventListener('change', () => {
			if (invertEl.checked) {
				colorfulEl.checked = false;
				colorfulEl.disabled = true;
			} else {
				colorfulEl.disabled = false;
			}
		});
	}

	function setStatus(text) {
		status.textContent = text || '';
	}

	async function doSearch() {
		const q = (qEl.value || '').trim();
		resultsEl.innerHTML = '';
		setStatus('搜索中…');
		selected = null;
		insertBtn.disabled = true;
		try {
			// determine selected tab from #source-tabs
			const tabs = document.getElementById('source-tabs');
			let source = 'emoj';
			if (tabs) {
				const active = tabs.querySelector('.tab.active');
				if (active && active.dataset && active.dataset.source) source = active.dataset.source;
			}

			if (source === 'emoj') {
				return;
			}

			let items = [];
			if (source === 'meme') {
				if (!q) {
					setStatus('请输入关键词并搜索');
					return;
				}
				// items = await searchTangdouMemes(q, 24);
				items = await searchApihzMemes(q, 24); // 获取24个梗图
				if (!items || items.length === 0) {
					setStatus('未找到图片，请修改关键词或重试');
					return;
				}
			}
			if (!items || items.length === 0) setStatus('未找到图片');
			else setStatus(`找到 ${items.length} 张图片`);
			renderResults(items || []);
		} catch (err) {
			setStatus('搜索出错：' + (err && err.message ? err.message : String(err)));
		}
	}

	// 渲染梗图搜索结果
	function renderResults(items) {
		if (resultsEl) resultsEl.style.display = 'block';
		resultsEl.innerHTML = '';
		items.forEach((it) => {
			const img = document.createElement('img');
			img.className = 'thumb';
			const url = it.thumbUrl || it.fullUrl;
			img.alt = it.title || '';
			img.title = it.title || '';
			img.crossOrigin = 'Anonymous';
			img.src = url;

			img.addEventListener('click', () => {
				Array.from(resultsEl.children).forEach((c) => c.classList.remove('selected'));
				img.classList.add('selected');
				selected = it;
				insertBtn.disabled = false;
			});

			resultsEl.appendChild(img);
		});
	}

	// 渲染 Emoji
	function renderEmojiPicker(filter) {
		if (!emojiPickerEl) return;
		const emojis = [
			'👍',
			'👏',
			'🙌',
			'👌',
			'✌️',
			'👍',
			'👎',
			'👊',
			'✊',
			'🤛',
			'🤜',
			'🤞',
			'🤟',
			'🤘',
			'👈',
			'👉',
			'👆',
			'👇',
			'😀',
			'😁',
			'😂',
			'🤣',
			'😃',
			'😄',
			'😅',
			'😆',
			'😉',
			'😊',
			'😇',
			'🙂',
			'🙃',
			'😍',
			'😘',
			'😗',
			'😙',
			'😚',
			'😋',
			'😛',
			'😜',
			'🤪',
			'🤨',
			'🧐',
			'🤓',
			'😎',
			'🤩',
			'🥳',
			'😏',
			'😒',
			'😞',
			'😔',
			'😟',
			'😕',
			'🙁',
			'☹️',
			'😣',
			'😖',
			'😫',
			'😩',
			'🥺',
			'😢',
			'😭',
			'😤',
			'😠',
			'😡',
			'🤬',
			'🤯',
			'😳',
			'🥵',
			'🥶',
			'😱',
			'😨',
			'😰',
			'😥',
			'😓',
			'🤗',
			'🤔',
			'🤭',
			'🤫',
			'🤥',
			'😶',
			'😐',
			'😑',
			'😬',
			'🙄',
			'😯',
			'😦',
			'😧',
			'😮',
			'😲',
			'🥱',
			'😴',
			'🤤',
			'😪',
			'😵',
			'🤐',
			'🥴',
			'🤢',
			'🤮',
			'😷',
			'🤒',
			'🤕',
			'🤑',
			'🤠',
			'😈',
			'👿',
			'💩',
		];
		const q = (filter || '').trim().toLowerCase();
		emojiPickerEl.innerHTML = '';

		// emoj -> canvas ->blob
		function renderEmojiToBlob(emoji, size = 256, bg = null) {
			return new Promise((resolve, reject) => {
				try {
					const c = document.createElement('canvas');
					c.width = size;
					c.height = size;
					const ctx = c.getContext('2d');
					if (!ctx) return reject(new Error('canvas context unavailable'));
					if (bg) {
						ctx.fillStyle = bg;
						ctx.fillRect(0, 0, size, size);
					} else {
						ctx.clearRect(0, 0, size, size);
					}

					const fontSize = Math.floor(size * 0.8);
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';
					ctx.font = `${fontSize}px sans-serif`;
					ctx.fillStyle = '#000';
					ctx.fillText(emoji, size / 2, size / 2);

					c.toBlob((blob) => {
						if (!blob) return reject(new Error('toBlob failed'));
						const dataUrl = c.toDataURL('image/png');
						resolve({ dataUrl, blob });
					}, 'image/png');
				} catch (err) {
					reject(err);
				}
			});
		}

		function renderEmojiToDataUrl(emoji, size = 64, bg = null) {
			const c = document.createElement('canvas');
			c.width = size;
			c.height = size;
			const ctx = c.getContext('2d');
			if (!ctx) return null;
			if (bg) {
				ctx.fillStyle = bg;
				ctx.fillRect(0, 0, size, size);
			} else {
				ctx.clearRect(0, 0, size, size);
			}
			const fontSize = Math.floor(size * 0.8);
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.font = `${fontSize}px sans-serif`;
			ctx.fillStyle = '#000';
			ctx.fillText(emoji, size / 2, size / 2);
			return c.toDataURL('image/png');
		}

		const list = emojis.filter((e) => !q || e.includes(filter) || e === filter);
		list.forEach((e) => {
			const img = document.createElement('img');
			img.className = 'thumb emoji-thumb';
			img.alt = e;
			img.title = e;
			const thumb = renderEmojiToDataUrl(e, 64);
			if (thumb) img.src = thumb;

			img.addEventListener('click', async () => {
				if (emojiPickerEl) Array.from(emojiPickerEl.querySelectorAll('.thumb')).forEach((c) => c.classList.remove('selected'));
				img.classList.add('selected');
				try {
					const { dataUrl, blob } = await renderEmojiToBlob(e, 256);
					selected = { title: e, thumbUrl: dataUrl, fullUrl: dataUrl, blob };
					insertBtn.disabled = false;
					setStatus('已选择 Emoji');
				} catch (err) {
					setStatus('Emoji 生成失败');
				}
			});
			emojiPickerEl.appendChild(img);
		});
		emojiPickerEl.style.display = 'block';
	}

	btn.addEventListener('click', doSearch);
	qEl.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') doSearch();
	});

	const tabs = document.getElementById('source-tabs');
	if (tabs) {
		tabs.addEventListener('click', (ev) => {
			const b = ev.target;
			if (b && b.classList && b.classList.contains('tab')) {
				Array.from(tabs.querySelectorAll('.tab')).forEach((t) => t.classList.remove('active'));
				b.classList.add('active');

				if (b.dataset.source === 'emoj') {
					if (emojiPickerEl) {
						if (resultsEl) resultsEl.style.display = 'none';
						renderEmojiPicker('');
						setStatus('请选择一个 Emoji');
					}
				} else {
					if (emojiPickerEl) emojiPickerEl.style.display = 'none';
					if (resultsEl) resultsEl.style.display = 'block';
				}
			}
		});
	}

	// 初始渲染 Emoji
	if (emojiPickerEl) {
		if (tabs) {
			Array.from(tabs.querySelectorAll('.tab')).forEach((t) => t.classList.remove('active'));
			const emojTab = tabs.querySelector('.tab[data-source="emoj"]');
			if (emojTab) emojTab.classList.add('active');
		}
		renderEmojiPicker('');
		setStatus('请选择一个 Emoji');
	}

	insertBtn.addEventListener('click', async () => {
		if (!selected) return;
		// const targetEl = document.getElementById('target');
		// const target = (targetEl && targetEl.value) || 'sch';
		const invert = !!(invertEl && invertEl.checked);
		const colorful = !!(colorfulEl && colorfulEl.checked);
		const url = selected.fullUrl || selected.thumbUrl;
		try {
			const resp = await fetch(url, { mode: 'cors' });
			if (!resp.ok) throw new Error('fetch image failed');
			const blob = await resp.blob();

			const objUrl = URL.createObjectURL(blob);
			const img = new Image();
			img.onload = async () => {
				const size = { width: img.naturalWidth, height: img.naturalHeight };
				URL.revokeObjectURL(objUrl);

				// 后续开放高级选项
				const opts = {};
				const tolEl = document.getElementById('dbg-tolerance');
				const simpEl = document.getElementById('dbg-simplification');
				const smoothEl = document.getElementById('dbg-smoothing');
				const despeckEl = document.getElementById('dbg-despeckling');
				const whiteEl = document.getElementById('dbg-white-bg');
				const scaleEl = document.getElementById('dbg-scale');
				if (tolEl) opts.tolerance = parseFloat(tolEl.value) || 0.5;
				if (simpEl) opts.simplification = parseInt(simpEl.value, 10) || 0;
				if (smoothEl) opts.smoothing = parseInt(smoothEl.value, 10) || 0;
				if (despeckEl) opts.despeckling = parseInt(despeckEl.value, 10) || 0;
				if (whiteEl) opts.whiteAsBackgroundColor = !!whiteEl.checked;
				const scaleVal = scaleEl ? Math.max(1, parseFloat(scaleEl.value) || 1) : 1;
				let blobToUse = blob;
				if (scaleVal > 1 && img.naturalWidth > 0 && img.naturalHeight > 0) {
					const c = document.createElement('canvas');
					c.width = Math.max(1, Math.round(size.width * scaleVal));
					c.height = Math.max(1, Math.round(size.height * scaleVal));
					const ctx = c.getContext('2d');
					if (ctx) {
						ctx.imageSmoothingEnabled = true;
						ctx.clearRect(0, 0, c.width, c.height);
						ctx.drawImage(img, 0, 0, c.width, c.height);
						try {
							blobToUse = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));

							size.width = c.width;
							size.height = c.height;
						} catch (err) {
							console.warn('Scaling canvas toBlob failed, using original blob', err);
						}
					}
				}
				edaInsertImage(size, blobToUse, invert, colorful, opts);
			};
			img.onerror = () => {
				URL.revokeObjectURL(objUrl);
			};
			img.src = objUrl;
		} catch (err) {
			console.error('Insert image failed:', err);
		}
	});
});
