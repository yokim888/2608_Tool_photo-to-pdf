'use client';

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';

type Photo = { id: string; file: File; url: string; rotation: number };
type PageSize = 'original' | 'a4' | 'letter';
type Margin = 'none' | 'small' | 'normal';
type WritableFileHandle = {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
};
type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<WritableFileHandle>;
  showDirectoryPicker?: () => Promise<{
    getFileHandle: (name: string, options: { create: boolean }) => Promise<WritableFileHandle>;
  }>;
};

const PAGE_SIZES = {
  a4: [595.28, 841.89],
  letter: [612, 792],
} as const;

const SUPPORTED_EXTENSIONS = /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif|tiff?)$/i;

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('這張圖片無法由目前瀏覽器開啟'));
    img.src = url;
  });
}

function safeBaseName(name: string) {
  return name.trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\.pdf$/i, '') || '照片';
}

async function combineSinglePagePdfs(singlePages: Uint8Array[]) {
  if (singlePages.length === 1) return singlePages[0];
  const combined = await PDFDocument.create();
  for (const singlePage of singlePages) {
    const source = await PDFDocument.load(singlePage);
    const [page] = await combined.copyPages(source, [0]);
    combined.addPage(page);
  }
  return combined.save({ useObjectStreams: true });
}

async function splitSinglePagePdfs(singlePages: Uint8Array[], maxBytes: number) {
  const estimatedGroups: Uint8Array[][] = [];
  let currentGroup: Uint8Array[] = [];
  let currentBytes = 0;

  for (const singlePage of singlePages) {
    if (currentGroup.length && currentBytes + singlePage.length > maxBytes) {
      estimatedGroups.push(currentGroup);
      currentGroup = [];
      currentBytes = 0;
    }
    currentGroup.push(singlePage);
    currentBytes += singlePage.length;
  }
  if (currentGroup.length) estimatedGroups.push(currentGroup);

  const fitGroup = async (group: Uint8Array[]): Promise<Uint8Array[]> => {
    const combined = await combineSinglePagePdfs(group);
    if (combined.length <= maxBytes || group.length === 1) return [combined];
    const middle = Math.ceil(group.length / 2);
    return [
      ...await fitGroup(group.slice(0, middle)),
      ...await fitGroup(group.slice(middle)),
    ];
  };

  const outputs: Uint8Array[] = [];
  for (const group of estimatedGroups) outputs.push(...await fitGroup(group));
  return outputs;
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<Photo[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [margin, setMargin] = useState<Margin>('small');
  const [quality, setQuality] = useState('0.62');
  const [fileName, setFileName] = useState('我的照片');
  const [splitSizeMb, setSplitSizeMb] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [message, setMessage] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => { photosRef.current = photos; }, [photos]);
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url)), []);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const isLocalPreview = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (isLocalPreview) {
      void (async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.filter((key) => key.startsWith('private-pdf-')).map((key) => caches.delete(key)));
        }
        if (navigator.serviceWorker.controller && !sessionStorage.getItem('local-cache-cleaned')) {
          sessionStorage.setItem('local-cache-cleaned', '1');
          location.reload();
        }
      })().catch(() => undefined);
      return;
    }
    const serviceWorkerUrl = new URL('./sw.js', window.location.href);
    const serviceWorkerScope = new URL('./', serviceWorkerUrl).pathname;
    navigator.serviceWorker.register(serviceWorkerUrl, { scope: serviceWorkerScope }).catch(() => undefined);
  }, []);

  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter((file) => file.type.startsWith('image/') || SUPPORTED_EXTENSIONS.test(file.name));
    if (!valid.length) {
      setMessage('沒有找到可使用的圖片檔案。');
      return;
    }
    const additions = valid.map((file, index) => ({
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
      file,
      url: URL.createObjectURL(file),
      rotation: 0,
    }));
    setPhotos((current) => [...current, ...additions]);
    setMessage(valid.length < incoming.length ? '部分非圖片檔案已略過。' : '');
  };

  const onChoose = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files || []));
    event.target.value = '';
  };

  const updatePhoto = (id: string, patch: Partial<Photo>) =>
    setPhotos((current) => current.map((photo) => photo.id === id ? { ...photo, ...patch } : photo));

  const removePhoto = (id: string) => {
    setPhotos((current) => {
      const target = current.find((photo) => photo.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((photo) => photo.id !== id);
    });
  };

  const movePhoto = (index: number, direction: -1 | 1) => {
    setPhotos((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const onDrop = (event: DragEvent<HTMLElement>, targetId?: string) => {
    event.preventDefault();
    const fileList = Array.from(event.dataTransfer.files || []);
    if (fileList.length) return addFiles(fileList);
    if (!dragId || !targetId || dragId === targetId) return;
    setPhotos((current) => {
      const from = current.findIndex((photo) => photo.id === dragId);
      const to = current.findIndex((photo) => photo.id === targetId);
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDragId(null);
  };

  const clearAll = () => {
    photos.forEach((photo) => URL.revokeObjectURL(photo.url));
    setPhotos([]);
    setMessage('');
  };

  const generatePdf = async () => {
    if (!photos.length || busy) return;
    const requestedSplitMb = splitSizeMb.trim() === '' ? 0 : Number(splitSizeMb);
    if (!Number.isFinite(requestedSplitMb) || requestedSplitMb < 0) {
      setMessage('單檔上限請輸入 0 或大於 0 的 MB 數值。');
      return;
    }
    const maxFileBytes = requestedSplitMb > 0 ? Math.floor(requestedSplitMb * 1024 * 1024) : null;
    setBusy(true);
    setMessage('');
    let cancelledAction = '處理';
    try {
      const pdf = maxFileBytes ? null : await PDFDocument.create();
      const singlePagePdfs: Uint8Array[] = [];
      const jpegQuality = Number(quality);
      const maxSide = jpegQuality >= 0.98
        ? 5200
        : jpegQuality >= 0.88
          ? 3600
          : jpegQuality >= 0.75
            ? 2400
            : jpegQuality >= 0.6
              ? 1600
              : 1200;

      for (let index = 0; index < photos.length; index += 1) {
        const photo = photos[index];
        setProgress(`正在處理第 ${index + 1} / ${photos.length} 張`);
        const image = await loadImage(photo.url);
        const quarterTurn = photo.rotation % 180 !== 0;
        const sourceWidth = image.naturalWidth;
        const sourceHeight = image.naturalHeight;
        const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
        const scaledWidth = Math.max(1, Math.round(sourceWidth * scale));
        const scaledHeight = Math.max(1, Math.round(sourceHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = quarterTurn ? scaledHeight : scaledWidth;
        canvas.height = quarterTurn ? scaledWidth : scaledHeight;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('無法建立圖片畫布');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.translate(canvas.width / 2, canvas.height / 2);
        context.rotate(photo.rotation * Math.PI / 180);
        context.drawImage(image, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
        const jpegData = canvas.toDataURL('image/jpeg', jpegQuality);
        const targetPdf = pdf ?? await PDFDocument.create();
        const embedded = await targetPdf.embedJpg(jpegData);

        let pageWidth: number;
        let pageHeight: number;
        if (pageSize === 'original') {
          const pointsPerPixel = 72 / 144;
          pageWidth = canvas.width * pointsPerPixel;
          pageHeight = canvas.height * pointsPerPixel;
        } else {
          const base = PAGE_SIZES[pageSize];
          const landscape = canvas.width > canvas.height;
          [pageWidth, pageHeight] = landscape ? [base[1], base[0]] : [base[0], base[1]];
        }
        const marginPoints = margin === 'none' ? 0 : margin === 'small' ? 18 : 36;
        const availableWidth = pageWidth - marginPoints * 2;
        const availableHeight = pageHeight - marginPoints * 2;
        const fit = Math.min(availableWidth / embedded.width, availableHeight / embedded.height);
        const drawWidth = embedded.width * fit;
        const drawHeight = embedded.height * fit;
        const page = targetPdf.addPage([pageWidth, pageHeight]);
        page.drawImage(embedded, {
          x: (pageWidth - drawWidth) / 2,
          y: (pageHeight - drawHeight) / 2,
          width: drawWidth,
          height: drawHeight,
        });
        if (maxFileBytes) singlePagePdfs.push(await targetPdf.save({ useObjectStreams: true }));
        canvas.width = 1;
        canvas.height = 1;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      setProgress(maxFileBytes ? '正在拆分 PDF…' : '正在完成 PDF…');
      const outputBytes = maxFileBytes
        ? await splitSinglePagePdfs(singlePagePdfs, maxFileBytes)
        : [await pdf!.save({ useObjectStreams: true })];
      const baseName = safeBaseName(fileName);
      const outputs = outputBytes.map((bytes, index) => {
        const name = outputBytes.length > 1 ? `${baseName}_第${index + 1}份.pdf` : `${baseName}.pdf`;
        const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
        return { name, blob, file: new File([blob], name, { type: 'application/pdf' }) };
      });
      const shareData = { files: outputs.map((output) => output.file), title: `${baseName}.pdf` };
      const pickerWindow = window as SaveFilePickerWindow;
      const isMobileDevice =
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const splitNote = outputs.length > 1 ? `，已拆成 ${outputs.length} 份` : '';
      const oversizedParts = maxFileBytes ? outputs.filter((output) => output.blob.size > maxFileBytes).length : 0;
      const oversizedNote = oversizedParts ? `；其中 ${oversizedParts} 份因單頁已超過上限，無法再拆` : '';

      if (!isMobileDevice && outputs.length > 1 && pickerWindow.showDirectoryPicker) {
        cancelledAction = '儲存';
        const directory = await pickerWindow.showDirectoryPicker();
        for (const output of outputs) {
          const handle = await directory.getFileHandle(output.name, { create: true });
          const writable = await handle.createWritable();
          await writable.write(output.blob);
          await writable.close();
        }
        setMessage(`PDF 已建立${splitNote}，並儲存到你選擇的資料夾${oversizedNote}。`);
      } else if (!isMobileDevice && pickerWindow.showSaveFilePicker) {
        cancelledAction = '儲存';
        for (const output of outputs) {
          const handle = await pickerWindow.showSaveFilePicker({
            suggestedName: output.name,
            types: [{ description: 'PDF 文件', accept: { 'application/pdf': ['.pdf'] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(output.blob);
          await writable.close();
        }
        setMessage(`PDF 已建立${splitNote}，並儲存到你選擇的位置${oversizedNote}。`);
      } else if (isMobileDevice && navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        cancelledAction = '分享';
        await navigator.share(shareData);
        setMessage(`PDF 已建立${splitNote}，請在分享選單中選擇儲存位置${oversizedNote}。`);
      } else {
        outputs.forEach((output, index) => {
          const url = URL.createObjectURL(output.blob);
          setTimeout(() => {
            const link = document.createElement('a');
            link.href = url;
            link.download = output.name;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 30_000);
          }, index * 250);
        });
        setMessage(`PDF 已建立${splitNote}並開始下載${oversizedNote}。`);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setMessage(`PDF 已建立；你取消了${cancelledAction}。`);
      } else {
        setMessage(error instanceof Error ? `處理失敗：${error.message}` : '處理失敗，請減少圖片數量後再試。');
      }
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  return (
    <main className="app-shell" onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event)}>
      <header className="topbar">
        <button className="brand" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="回到頂端">
          <span className="brand-mark" aria-hidden="true">P</span><span>照片轉 PDF</span>
        </button>
        <div className="privacy-pill"><span aria-hidden="true">●</span> 全程離線・不上傳</div>
      </header>

      {!photos.length ? (
        <>
          <section className="hero">
            <p className="eyebrow">PRIVATE PDF MAKER</p>
            <h1>照片整理好，<br />一次變成 PDF。</h1>
            <p className="intro">支援多張照片與常見圖片格式。所有處理都在這台裝置完成，你的影像不會離開手機。</p>
          </section>
          <section className="workspace-card">
            <button className="dropzone" type="button" onClick={() => inputRef.current?.click()}>
              <span className="add-icon" aria-hidden="true">＋</span>
              <strong>選擇照片或圖片</strong>
              <span>可一次選取多張，也能直接拍照</span>
              <small>JPG・PNG・WEBP・GIF・BMP・HEIC・AVIF</small>
            </button>
          </section>
          <section className="steps" aria-label="使用步驟">
            <div><b>01</b><span><strong>選取</strong><small>從相簿或檔案加入</small></span></div>
            <div><b>02</b><span><strong>整理</strong><small>排序、旋轉與設定</small></span></div>
            <div><b>03</b><span><strong>輸出</strong><small>儲存或分享 PDF</small></span></div>
          </section>
        </>
      ) : (
        <section className="editor">
          <div className="editor-heading">
            <div><p className="eyebrow">YOUR DOCUMENT</p><h1>整理照片</h1><p>{photos.length} 張圖片・長按或使用箭頭調整順序</p></div>
            <button className="text-button danger" type="button" onClick={clearAll}>全部清除</button>
          </div>

          <div className="photo-grid">
            {photos.map((photo, index) => (
              <div className="photo-card" key={photo.id} draggable onDragStart={() => setDragId(photo.id)} onDrop={(event) => onDrop(event, photo.id)}>
                <div className="photo-number">{String(index + 1).padStart(2, '0')}</div>
                {/* Browser-native decoding preserves iPhone orientation and supports formats available on that device. */}
                <img src={photo.url} alt={photo.file.name} style={{ transform: `rotate(${photo.rotation}deg)` }} />
                <div className="photo-info"><strong title={photo.file.name}>{photo.file.name}</strong><small>{(photo.file.size / 1024 / 1024).toFixed(1)} MB</small></div>
                <div className="photo-actions">
                  <button type="button" onClick={() => movePhoto(index, -1)} disabled={index === 0} aria-label="往前移">←</button>
                  <button type="button" onClick={() => movePhoto(index, 1)} disabled={index === photos.length - 1} aria-label="往後移">→</button>
                  <button type="button" onClick={() => updatePhoto(photo.id, { rotation: (photo.rotation + 90) % 360 })} aria-label="向右旋轉">↻</button>
                  <button type="button" className="remove" onClick={() => removePhoto(photo.id)} aria-label="刪除">×</button>
                </div>
              </div>
            ))}
            <button className="add-more" type="button" onClick={() => inputRef.current?.click()}><span>＋</span><strong>加入更多圖片</strong></button>
          </div>

          <div className="settings-card">
            <div className="settings-title"><span>輸出設定</span><small>每張圖片會成為一頁</small></div>
            <div className="setting-grid">
              <label><span>檔案名稱</span><input value={fileName} onChange={(event) => setFileName(event.target.value)} maxLength={80} /></label>
              <label><span>頁面尺寸</span><select value={pageSize} onChange={(event) => setPageSize(event.target.value as PageSize)}><option value="a4">A4（自動方向）</option><option value="letter">Letter（自動方向）</option><option value="original">依圖片比例</option></select></label>
              <label><span>頁面留白</span><select value={margin} onChange={(event) => setMargin(event.target.value as Margin)}><option value="none">無留白</option><option value="small">窄邊界</option><option value="normal">標準邊界</option></select></label>
              <label><span>圖片畫質</span><select value={quality} onChange={(event) => setQuality(event.target.value)}><option value="0.5">極小檔案（傳送優先）</option><option value="0.62">小檔案（建議）</option><option value="0.78">精簡檔案</option><option value="0.9">平衡畫質</option><option value="1">最高畫質</option></select></label>
              <label><span>單檔上限（MB）</span><input type="number" min="0" step="0.5" inputMode="decimal" value={splitSizeMb} onChange={(event) => setSplitSizeMb(event.target.value)} placeholder="不限，填 0 也不拆分" /></label>
            </div>
            <button className="make-pdf" type="button" onClick={generatePdf} disabled={busy}>
              <span>{busy ? '處理中' : '建立 PDF'}</span><b>{busy ? progress : `${photos.length} 頁 →`}</b>
            </button>
          </div>
        </section>
      )}

      <input ref={inputRef} type="file" accept="image/*,.heic,.heif,.avif,.tif,.tiff" multiple hidden onChange={onChoose} />
      {message && <div className="toast" role="status"><span>{message}</span><button type="button" onClick={() => setMessage('')} aria-label="關閉">×</button></div>}
      <footer><span>🔒</span> 影像只暫存在目前頁面，關閉後自動清除</footer>
    </main>
  );
}
