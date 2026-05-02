import re

with open('c:\\Users\\RAO JATIN\\OneDrive\\sasasssss\\admin-panel\\src\\pages\\RgpChallanPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update upload logic
upload_old = '''      const uploadedUrls = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i]);
        const url = await uploadToImgbb(compressed);
        if (url) uploadedUrls.push(url);
      }
      const existingUrls = form.challanImageUrls || (form.challanImageUrl ? [form.challanImageUrl] : []);
      const newUrls = [...existingUrls, ...uploadedUrls];
      setForm({ ...form, challanImageUrls: newUrls, challanImageUrl: newUrls[0] || '' });'''

upload_new = '''      const uploadedFiles = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressed = await compressImage(file);
        const url = await uploadToImgbb(compressed);
        if (url) {
          const sizeMB = (compressed.size / (1024 * 1024)).toFixed(2);
          uploadedFiles.push({ url, size: sizeMB + ' MB', name: file.name });
        }
      }
      const existingUrls = form.challanImageUrls || (form.challanImageUrl ? [{ url: form.challanImageUrl, size: 'Unknown', name: 'Attachment' }] : []);
      const newUrls = [...existingUrls, ...uploadedFiles];
      setForm({ ...form, challanImageUrls: newUrls, challanImageUrl: newUrls[0]?.url || newUrls[0] || '' });'''

content = content.replace(upload_old, upload_new)

# 2. Update modal attachments list
modal_old = '''     {(form.challanImageUrls || [form.challanImageUrl]).filter(Boolean).map((url, i) => (
        <div key={i} className=\"flex items-center gap-3 p-2 border border-gray-100 rounded-lg bg-gray-50\">
          <div className=\"w-10 h-10 rounded overflow-hidden border border-gray-200 shrink-0\">
            <img src={url} alt={`Attachment ${i + 1}`} className=\"w-full h-full object-cover\" />
          </div>
          <div className=\"flex-1 flex gap-2\">
            <a href={url} target=\"_blank\" rel=\"noreferrer\" className=\"flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-100/50 rounded-lg hover:bg-teal-100 transition-colors\">
              <Eye className=\"w-3.5 h-3.5\" /> View
            </a>
            <button onClick={() => {
              // For imgbb, direct download via <a> might be tricky due to CORS, but we can try fetching as blob
              fetch(url).then(res => res.blob()).then(blob => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `Challan_Image_${i + 1}.jpg`;
                a.click();
              }).catch(() => {
                // Fallback: open in new tab
                window.open(url, '_blank');
              });
            }} className=\"flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100/50 rounded-lg hover:bg-blue-100 transition-colors\">
              <Download className=\"w-3.5 h-3.5\" /> Download
            </button>
          </div>
          <button onClick={() => {
            const newUrls = (form.challanImageUrls || [form.challanImageUrl]).filter((_, idx) => idx !== i);
            setForm({ ...form, challanImageUrls: newUrls, challanImageUrl: newUrls[0] || '' });
          }} className=\"text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors\">
            <X className=\"w-4 h-4\" />
          </button>
        </div>
      ))}'''

modal_new = '''     {(form.challanImageUrls || (form.challanImageUrl ? [{ url: form.challanImageUrl, size: 'Unknown', name: 'Attachment' }] : [])).filter(Boolean).map((img, i) => {
        const imgObj = typeof img === 'string' ? { url: img, size: 'Unknown', name: `Attachment ${i + 1}` } : img;
        return (
        <div key={i} className=\"flex items-center gap-3 p-2 border border-gray-100 rounded-lg bg-gray-50\">
          <div className=\"w-10 h-10 rounded overflow-hidden border border-gray-200 shrink-0\">
            <img src={imgObj.url} alt={imgObj.name} className=\"w-full h-full object-cover\" />
          </div>
          <div className=\"flex-1 flex gap-2 items-center\">
            <span className=\"text-xs font-medium text-gray-700 truncate max-w-[120px]\">{imgObj.name}</span>
            <span className=\"text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded\">{imgObj.size}</span>
            <div className=\"ml-auto flex gap-2\">
              <a href={imgObj.url} target=\"_blank\" rel=\"noreferrer\" className=\"flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-100/50 rounded-lg hover:bg-teal-100 transition-colors\">
                <Eye className=\"w-3.5 h-3.5\" /> View
              </a>
              <button type=\"button\" onClick={() => {
                const toastId = Math.random().toString();
                const event = new CustomEvent('toast', { detail: { id: toastId, type: 'info', message: 'Download started...' } });
                window.dispatchEvent(event);
                fetch(imgObj.url).then(res => res.blob()).then(blob => {
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = imgObj.name || `Challan_Image_${i + 1}.jpg`;
                  a.click();
                  window.dispatchEvent(new CustomEvent('toast', { detail: { id: toastId, type: 'success', message: 'Download complete!' } }));
                }).catch(() => {
                  window.open(imgObj.url, '_blank');
                });
              }} className=\"flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100/50 rounded-lg hover:bg-blue-100 transition-colors\">
                <Download className=\"w-3.5 h-3.5\" /> Download
              </button>
            </div>
          </div>
          <button type=\"button\" onClick={() => {
            const newUrls = (form.challanImageUrls || (form.challanImageUrl ? [form.challanImageUrl] : [])).filter((_, idx) => idx !== i);
            setForm({ ...form, challanImageUrls: newUrls, challanImageUrl: newUrls[0]?.url || newUrls[0] || '' });
          }} className=\"text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors\">
            <X className=\"w-4 h-4\" />
          </button>
        </div>
      )})}'''

content = content.replace(modal_old, modal_new)

# 3. Update table headers
th_old = '''  <th className=\"table-header\">Type</th><th className=\"table-header\">Company</th><th className=\"table-header\">Challan No.</th>
  <th className=\"table-header\">Description</th><th className=\"table-header\">Sent Date</th>
  <th className=\"table-header\">Doc Stage</th><th className=\"table-header\">Status</th><th className=\"table-header\">Actions</th>'''

th_new = '''  <th className=\"table-header\">Type</th><th className=\"table-header\">Company</th><th className=\"table-header\">Challan No.</th>
  <th className=\"table-header\">Description</th><th className=\"table-header\">Attachments</th><th className=\"table-header\">Sent Date</th>
  <th className=\"table-header\">Doc Stage</th><th className=\"table-header\">Status</th><th className=\"table-header\">Actions</th>'''

content = content.replace(th_old, th_new)

# 4. Update table row
td_old = '''  <td className=\"table-cell text-[var(--text-muted)] text-xs\">
    <div className=\"flex items-center gap-2\">
      {r.challanNumber || '-'}
      {(r.challanImageUrls?.length > 0 || r.challanImageUrl) && (
        <a href={r.challanImageUrls?.[0] || r.challanImageUrl} target=\"_blank\" rel=\"noreferrer\" title={`View ${r.challanImageUrls?.length > 1 ? 'Attachments' : 'Attachment'}`} className=\"text-teal-500 hover:text-teal-700 bg-teal-50 p-1 rounded flex items-center gap-1\">
          <ImageIcon className=\"w-3.5 h-3.5\" />
          {r.challanImageUrls?.length > 1 && <span className=\"text-[10px] font-bold\">{r.challanImageUrls.length}</span>}
        </a>
      )}
    </div>
  </td>
  <td className=\"table-cell text-[var(--text-muted)] text-xs max-w-[200px] truncate\">{r.description || '-'}</td>
  <td className=\"table-cell text-[var(--text-muted)] text-xs\">'''

td_new = '''  <td className=\"table-cell text-[var(--text-muted)] text-xs\">{r.challanNumber || '-'}</td>
  <td className=\"table-cell text-[var(--text-muted)] text-xs max-w-[200px] truncate\">{r.description || '-'}</td>
  <td className=\"table-cell\">
    <div className=\"flex flex-wrap gap-2 min-w-[150px]\">
      {(r.challanImageUrls || (r.challanImageUrl ? [{ url: r.challanImageUrl, size: 'Unknown', name: 'Attachment' }] : [])).filter(Boolean).map((img, i) => {
        const imgObj = typeof img === 'string' ? { url: img, size: 'Unknown', name: `Attachment ${i + 1}` } : img;
        return (
          <div key={i} className=\"flex flex-col gap-1 p-1.5 border border-gray-100 rounded bg-gray-50\">
            <div className=\"flex items-center gap-2\">
              <img src={imgObj.url} alt={imgObj.name} className=\"w-8 h-8 object-cover rounded shadow-sm border border-gray-200\" />
              <div className=\"flex flex-col\">
                <span className=\"text-[9px] font-medium text-gray-600 truncate w-16\">{imgObj.name}</span>
                <span className=\"text-[8px] text-gray-400\">{imgObj.size}</span>
              </div>
            </div>
            <div className=\"flex gap-1 mt-0.5\">
              <a href={imgObj.url} target=\"_blank\" rel=\"noreferrer\" className=\"flex-1 text-center py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded text-[9px] font-medium transition-colors\">View</a>
              <button type=\"button\" onClick={() => {
                const toastId = Math.random().toString();
                const event = new CustomEvent('toast', { detail: { id: toastId, type: 'info', message: 'Download started...' } });
                window.dispatchEvent(event);
                fetch(imgObj.url).then(res => res.blob()).then(blob => {
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = imgObj.name || `Challan_Image_${i + 1}.jpg`;
                  a.click();
                  window.dispatchEvent(new CustomEvent('toast', { detail: { id: toastId, type: 'success', message: 'Download complete!' } }));
                }).catch(() => {
                  window.open(imgObj.url, '_blank');
                });
              }} className=\"flex-1 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[9px] font-medium transition-colors\">
                Save
              </button>
            </div>
          </div>
        );
      })}
      {!(r.challanImageUrls?.length > 0 || r.challanImageUrl) && (
        <span className=\"text-xs text-gray-400 italic\">None</span>
      )}
    </div>
  </td>
  <td className=\"table-cell text-[var(--text-muted)] text-xs\">'''

content = content.replace(td_old, td_new)

with open('c:\\Users\\RAO JATIN\\OneDrive\\sasasssss\\admin-panel\\src\\pages\\RgpChallanPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
