// 随机图片代理：拉取远端图片并返回 data URL，用于绕过 CORS 且实现“收藏当前背景”
export async function onRequest(context) {
	const { request } = context;
	const cors = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
	};
	if (request.method === 'OPTIONS') {
		return new Response(null, { headers: cors });
	}

	try {
		const url = new URL(request.url);
		const src = url.searchParams.get('url') || 'https://imgapi.xl0408.top/index.php';

		const resp = await fetch(src, { redirect: 'follow' });
		if (!resp.ok) {
			return new Response(JSON.stringify({ success: false, message: `Upstream error ${resp.status}` }), {
				status: 502,
				headers: { ...cors, 'Content-Type': 'application/json' }
			});
		}
		const contentType = resp.headers.get('content-type') || 'image/jpeg';
		const ab = await resp.arrayBuffer();
		let binary = '';
		const bytes = new Uint8Array(ab);
		const len = bytes.byteLength;
		for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
		const base64 = btoa(binary);
		const dataUrl = `data:${contentType};base64,${base64}`;

		return new Response(JSON.stringify({ success: true, dataUrl, contentType }), {
			headers: { ...cors, 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ success: false, message: error.message }), {
			status: 500,
			headers: { ...cors, 'Content-Type': 'application/json' }
		});
	}
}

