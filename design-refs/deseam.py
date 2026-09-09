import numpy as np
from PIL import Image

SEAM = 383      # 오른쪽 절반이 시작하는 열
WIN = 12        # 좌우로 읽어낼 폭
BAND = 150      # 밝기 단차를 펴는 폭
BLUR_SIG = 3.0  # 경계 흐림 정도
BLUR_REACH = 5.0

def gauss1d(arr, sigma, axis):
    r = int(sigma * 3)
    k = np.exp(-np.arange(-r, r + 1) ** 2 / (2 * sigma ** 2)); k /= k.sum()
    pad = [(0, 0)] * arr.ndim; pad[axis] = (r, r)
    p = np.pad(arr, pad, mode='edge')
    out = np.zeros_like(arr)
    for i, w in enumerate(k):
        sl = [slice(None)] * arr.ndim; sl[axis] = slice(i, i + arr.shape[axis])
        out += w * p[tuple(sl)]
    return out

def edge_value(block, u):
    """창 안의 화소를 직선으로 근사해 이음매 위치까지 연장한 값."""
    ub = u.mean(); vb = block.mean(axis=1, keepdims=True)
    b = ((u - ub)[None, :, None] * (block - vb)).sum(axis=1) / ((u - ub) ** 2).sum()
    return vb[:, 0, :] - b * ub

im = Image.open('public/card-frame.png').convert('RGBA')
W, H = im.size
a = np.array(im).astype(np.float64)
rgb, alpha = a[:, :, :3].copy(), a[:, :, 3:4]

# 1) 이음매에서만 생기는 '단차'를 골라낸다.
#    좌우를 각각 직선으로 연장해 맞대보면, 이어지는 무늬는 차이가 0에 가깝고
#    실제로 끊긴 곳만 값이 남는다. (뾰족한 상단 꼭짓점 같은 구조를 덜 건드리려는 것)
uL = np.arange(-WIN + 0.5, 0)
uR = np.arange(0.5, WIN + 0.5)
d = edge_value(rgb[:, SEAM:SEAM + WIN, :], uR) - edge_value(rgb[:, SEAM - WIN:SEAM, :], uL)
d = np.clip(gauss1d(d, 9.0, 0), -55, 55)[:, None, :]

t = np.arange(W)[None, :, None].astype(np.float64)
ramp_l = np.where(t < SEAM, 0.5 * (1 + np.cos(np.pi * np.clip(SEAM - 1 - t, 0, BAND) / BAND)), 0)
ramp_r = np.where(t >= SEAM, 0.5 * (1 + np.cos(np.pi * np.clip(t - SEAM, 0, BAND) / BAND)), 0)
rgb = rgb + d / 2 * ramp_l - d / 2 * ramp_r

# 2) 남은 1픽셀 경계만 가로로 부드럽게 섞는다 (알파를 미리 곱해 번짐 방지)
pm = rgb * (alpha / 255.0)
blur = gauss1d(pm, BLUR_SIG, 1)
ab = gauss1d(alpha, BLUR_SIG, 1)
blur = np.where(ab > 1, blur / np.maximum(ab, 1e-6) * 255.0, rgb)
m = np.exp(-((t - (SEAM - 0.5)) ** 2) / (2 * BLUR_REACH ** 2))
rgb = rgb * (1 - m) + blur * m

out = np.concatenate([np.clip(rgb, 0, 255), alpha], axis=2).astype(np.uint8)
Image.fromarray(out, 'RGBA').save('public/card-frame.png', optimize=True)

o = np.array(Image.open('/tmp/claude-0/-home-user-Taes3/afca03aa-157d-5485-a169-4c86c5d6ee42/scratchpad/card-frame-orig.png').convert('RGBA')).astype(float)[:, :, :3].mean(axis=2)
n = np.array(Image.open('public/card-frame.png').convert('RGBA')).astype(float)[:, :, :3].mean(axis=2)
print('경계 단차: 전 %.1f → 후 %.1f' % (np.abs(o[:, SEAM] - o[:, SEAM-1]).mean(), np.abs(n[:, SEAM] - n[:, SEAM-1]).mean()))
print('상단 5%% 구간 변화 %.2f, 사진 위 5~16%% 구간 변화 %.2f' % (np.abs(n-o)[:int(H*.05)].mean(), np.abs(n-o)[int(H*.05):int(H*.16)].mean()))
