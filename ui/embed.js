(function () {
  async function renderForms() {
    const targets = document.querySelectorAll('[data-form-id]');
    if (!targets.length) return;

    // Inject Google Font Outfit if not already loaded
    if (!document.getElementById('fb-embed-font')) {
      const link = document.createElement('link');
      link.id = 'fb-embed-font';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&display=swap';
      document.head.appendChild(link);
    }

    for (const el of targets) {
      const formId = el.dataset.formId;
      if (!formId) continue;
      
      try {
        const res = await fetch(`/form-builder/api/forms/${formId}`);
        const form = await res.json();
        if (!form || !form.fields) continue;

        const formEl = document.createElement('form');
        formEl.style.cssText = `
          max-width: 520px;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 18px;
          font-family: 'Outfit', sans-serif;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
          box-sizing: border-box;
        `;
        
        formEl.innerHTML = `
          <div class="fb-error-banner" style="display: none; padding: 12px 16px; border-radius: 8px; background: #fff2f2; border: 1px solid #ffc9c9; color: #ff3b30; font-size: 13.5px; font-weight: 500; margin-bottom: 16px; align-items: center; gap: 10px; box-sizing: border-box; font-family: inherit; animation: fbFadeIn 0.3s ease;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" stroke-width="2.5" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span class="fb-error-text"></span>
          </div>
        ` + form.fields.map(f => buildField(f)).join('') + `
          <div style="display: flex; gap: 12px; margin-top: 6px; align-self: flex-start; flex-wrap: wrap;">
            <button type="submit"
              style="
                padding: 12px 24px;
                background: #15171a;
                color: #fff;
                border: none;
                border-radius: 8px;
                font-size: 14.5px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 4px 12px rgba(21, 23, 26, 0.15);
                font-family: inherit;
              "
              onmouseover="this.style.background='#000'; this.style.transform='translateY(-1px)';"
              onmouseout="this.style.background='#15171a'; this.style.transform='translateY(0)';"
            >
              Submit Response
            </button>
            <button type="reset"
              style="
                padding: 12px 24px;
                background: transparent;
                color: #7c8b9a;
                border: 1px solid rgba(0, 0, 0, 0.12);
                border-radius: 8px;
                font-size: 14.5px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: inherit;
              "
              onmouseover="this.style.borderColor='rgba(0,0,0,0.24)'; this.style.color='#15171a'; this.style.transform='translateY(-1px)';"
              onmouseout="this.style.borderColor='rgba(0,0,0,0.12)'; this.style.color='#7c8b9a'; this.style.transform='translateY(0)';"
            >
              Reset
            </button>
          </div>
        `;

        formEl.addEventListener('reset', () => {
          const errorBanner = formEl.querySelector('.fb-error-banner');
          if (errorBanner) {
            errorBanner.style.display = 'none';
          }
        });

        formEl.addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const errorBanner = formEl.querySelector('.fb-error-banner');
          const errorText = formEl.querySelector('.fb-error-text');
          if (errorBanner) {
            errorBanner.style.display = 'none';
          }
          
          const submitBtn = formEl.querySelector('button[type="submit"]');
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.6';
            submitBtn.textContent = 'Submitting...';
          }

          const data = {};
          // Fetch fields dynamically
          const formData = new FormData(formEl);
          for (const key of formData.keys()) {
            const values = formData.getAll(key);
            const el = formEl.querySelector(`[name="${key}"]`);
            if (el && el.tagName === 'SELECT' && el.multiple) {
              data[key] = values;
            } else {
              if (values.length > 1) {
                data[key] = values;
              } else {
                data[key] = values[0];
              }
            }
          }

          // Combine country code and phone number for 'phone' type fields
          if (form && form.fields) {
            form.fields.forEach(f => {
              if (f.type === 'phone') {
                const phoneInput = formEl.querySelector(`input[name="${f.label}"]`);
                const countrySelect = formEl.querySelector(`select[name="${f.label}_country_code"]`);
                if (phoneInput && countrySelect) {
                  const phoneVal = phoneInput.value.trim();
                  if (phoneVal) {
                    data[f.label] = `${countrySelect.value} ${phoneVal}`;
                  } else {
                    data[f.label] = '';
                  }
                }
                delete data[`${f.label}_country_code`];
              }
            });
          }

          // Handle file uploads asynchronously to convert them to Base64
          const readFileAsDataURL = (file) => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          });

          try {
            const fileInputs = formEl.querySelectorAll('input[type="file"]');
            for (const input of fileInputs) {
              const name = input.name;
              if (input.files && input.files[0]) {
                const file = input.files[0];
                if (file.size > 10 * 1024 * 1024) { // 10MB limit
                  throw new Error(`File "${file.name}" exceeds the 10MB size limit.`);
                }
                const dataUrl = await readFileAsDataURL(file);
                if (dataUrl) {
                  data[name] = {
                    filename: file.name,
                    size: file.size,
                    type: file.type,
                    data: dataUrl
                  };
                }
              } else {
                data[name] = null;
              }
            }

            const submitRes = await fetch(`/form-builder/submit/${formId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            }).then(r => r.json());

            if (submitRes.ok) {
              formEl.innerHTML = `
                <div style="text-align: center; padding: 30px 0; animation: fbFadeIn 0.3s ease;">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#30d158" stroke-width="2" style="margin-bottom:12px;">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <h3 style="font-size:18px; font-weight:600; color:#15171a; margin-bottom:6px;">Submission Received!</h3>
                  <p style="color:#7c8b9a; font-size:14px; margin:0;">Thank you! Your information has been logged successfully.</p>
                </div>`;
            } else {
              if (errorBanner && errorText) {
                errorText.textContent = 'Error submitting form: ' + (submitRes.error || 'Unknown error');
                errorBanner.style.display = 'flex';
              }
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.textContent = 'Submit Response';
              }
            }
          } catch (err) {
            if (errorBanner && errorText) {
              errorText.textContent = 'Failed to submit form: ' + err.message;
              errorBanner.style.display = 'flex';
            }
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.style.opacity = '1';
              submitBtn.textContent = 'Submit Response';
            }
          }
        });

        el.replaceWith(formEl);
      } catch (err) {
        console.error('[form-builder] Render error:', err);
      }
    }
  }

  function buildField(f) {
    const inputStyle = `
      width: 100%;
      padding: 10px 14px;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      background: #fff;
      color: #15171a;
      box-sizing: border-box;
      transition: all 0.2s ease;
      outline: none;
    `;
    const labelStyle = `
      display: block;
      font-size: 13.5px;
      font-weight: 500;
      color: #333;
      margin-bottom: 6px;
    `;

    const focusScript = `
      onfocus="this.style.borderColor='#0a84ff'; this.style.boxShadow='0 0 0 3px rgba(10,132,255,0.15)';"
      onblur="this.style.borderColor='rgba(0,0,0,0.12)'; this.style.boxShadow='none';"
    `;

    const reqAttr = f.required ? 'required' : '';
    const reqStar = f.required ? '<span style="color:#ff453a; margin-left: 2px;">*</span>' : '';

    switch (f.type) {
      case 'text':
        return `
          <div>
            <label style="${labelStyle}">${f.label}${reqStar}</label>
            <input style="${inputStyle}" type="text" name="${f.label}" placeholder="Enter ${f.label.toLowerCase()}..." ${reqAttr} ${focusScript}>
          </div>`;
      case 'email':
        return `
          <div>
            <label style="${labelStyle}">${f.label}${reqStar}</label>
            <input style="${inputStyle}" type="email" name="${f.label}" placeholder="name@domain.com" ${reqAttr} ${focusScript}>
          </div>`;
      case 'phone':
        const phoneInputStyle = `
          flex: 1;
          padding: 10px 14px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          background: #fff;
          color: #15171a;
          box-sizing: border-box;
          transition: all 0.2s ease;
          outline: none;
        `;
        const selectStyle = `
          padding: 10px 12px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          background: #fff;
          color: #15171a;
          box-sizing: border-box;
          outline: none;
          cursor: pointer;
        `;
        return `
          <div>
            <label style="${labelStyle}">${f.label}${reqStar}</label>
            <div style="display: flex; gap: 8px;">
              <select name="${f.label}_country_code" style="${selectStyle}" ${focusScript}
                      onchange="
                        const lenMap = {
                          '+1': { min: 10, max: 10 },
                          '+91': { min: 10, max: 10 },
                          '+44': { min: 10, max: 10 },
                          '+61': { min: 9, max: 9 },
                          '+81': { min: 10, max: 10 },
                          '+49': { min: 10, max: 11 },
                          '+33': { min: 9, max: 9 },
                          '+86': { min: 11, max: 11 },
                          '+55': { min: 10, max: 11 },
                          '+7': { min: 10, max: 10 },
                          '+27': { min: 9, max: 9 },
                          '+971': { min: 9, max: 9 },
                          '+65': { min: 8, max: 8 },
                          '+34': { min: 9, max: 9 },
                          '+39': { min: 10, max: 10 }
                        };
                        const cfg = lenMap[this.value] || { min: 5, max: 15 };
                        const inp = this.nextElementSibling;
                        inp.minLength = cfg.min;
                        inp.maxLength = cfg.max;
                        inp.pattern = '[0-9]{' + cfg.min + ',' + cfg.max + '}';
                        inp.placeholder = '9876543210'.substring(0, cfg.max);
                        inp.title = 'Please enter exactly ' + (cfg.min === cfg.max ? cfg.min : cfg.min + ' to ' + cfg.max) + ' digits';
                        if (inp.value) { inp.value = inp.value.substring(0, cfg.max); }
                      ">
                <option value="+1">🇺🇸 +1</option>
                <option value="+91" selected>🇮🇳 +91</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+61">🇦🇺 +61</option>
                <option value="+81">🇯🇵 +81</option>
                <option value="+49">🇩🇪 +49</option>
                <option value="+33">🇫🇷 +33</option>
                <option value="+86">🇨🇳 +86</option>
                <option value="+55">🇧🇷 +55</option>
                <option value="+7">🇷🇺 +7</option>
                <option value="+27">🇿🇦 +27</option>
                <option value="+971">🇦🇪 +971</option>
                <option value="+65">🇸🇬 +65</option>
                <option value="+34">🇪🇸 +34</option>
                <option value="+39">🇮🇹 +39</option>
              </select>
              <input style="${phoneInputStyle}" type="tel" name="${f.label}" placeholder="9876543210" ${reqAttr} 
                     minLength="10" maxLength="10" pattern="[0-9]{10}" title="Please enter exactly 10 digits"
                     oninput="this.value = this.value.replace(/[^0-9]/g, '').substring(0, this.maxLength)"
                     ${focusScript}>
            </div>
          </div>`;
      case 'number':
        const minAttr = f.min !== undefined && f.min !== '' ? `min="${f.min}"` : '';
        const maxAttr = f.max !== undefined && f.max !== '' ? `max="${f.max}"` : '';
        return `
          <div>
            <label style="${labelStyle}">${f.label}${reqStar}</label>
            <input style="${inputStyle}" type="number" name="${f.label}" placeholder="Enter number..." ${reqAttr} ${minAttr} ${maxAttr} ${focusScript}>
          </div>`;
      case 'url':
        return `
          <div>
            <label style="${labelStyle}">${f.label}${reqStar}</label>
            <input style="${inputStyle}" type="url" name="${f.label}" placeholder="https://example.com" ${reqAttr} ${focusScript}>
          </div>`;
      case 'textarea':
        return `
          <div>
            <label style="${labelStyle}">${f.label}${reqStar}</label>
            <textarea style="${inputStyle} resize: vertical; min-height: 90px;" name="${f.label}" placeholder="Write your ${f.label.toLowerCase()}..." rows="3" ${reqAttr} ${focusScript}></textarea>
          </div>`;
      case 'dropdown':
        const opts = (f.options || '').split(',').map(o =>
          `<option value="${o.trim()}">${o.trim()}</option>`).join('');
        return `
          <div>
            <label style="${labelStyle}">${f.label}${reqStar}</label>
            <select style="${inputStyle}" name="${f.label}" ${reqAttr} ${focusScript}>
              <option value="" disabled selected>Select an option...</option>
              ${opts}
            </select>
          </div>`;
      case 'radio':
        const radioOpts = (f.options || '').split(',').map((o, idx) => {
          const id = `fb-${f.id}-${idx}`;
          return `
            <label for="${id}" style="display: flex; align-items: center; gap: 8px; font-size: 14px; color: #444; cursor: pointer; margin-bottom: 6px; user-select:none;">
              <input type="radio" id="${id}" name="${f.label}" value="${o.trim()}" ${reqAttr} style="width:16px; height:16px; cursor:pointer;">
              <span>${o.trim()}</span>
            </label>
          `;
        }).join('');
        return `
          <div>
            <label style="${labelStyle}">${f.label}${reqStar}</label>
            <div style="display:flex; flex-direction:column; margin-top:4px;">
              ${radioOpts}
            </div>
          </div>`;
      case 'checkbox':
        return `
          <div style="margin: 4px 0;">
            <label style="display: flex; align-items: center; gap: 10px; font-size: 14px; color:#333; cursor:pointer; user-select:none;">
              <input type="checkbox" name="${f.label}" ${reqAttr} style="width: 16px; height: 16px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.12); cursor:pointer;">
              <span>${f.label}${reqStar}</span>
            </label>
          </div>`;
      case 'date':
        return `
          <div>
            <label style="${labelStyle}">${f.label}${reqStar}</label>
            <input style="${inputStyle}" type="date" name="${f.label}" ${reqAttr} ${focusScript}>
          </div>`;
      case 'time':
        return `
          <div>
            <label style="${labelStyle}">${f.label}${reqStar}</label>
            <input style="${inputStyle}" type="time" name="${f.label}" ${reqAttr} ${focusScript}>
          </div>`;
      case 'datetime':
        return `
          <div>
            <label style="${labelStyle}">${f.label}${reqStar}</label>
            <input style="${inputStyle}" type="datetime-local" name="${f.label}" ${reqAttr} ${focusScript}>
          </div>`;
      case 'file':
        return `
          <div>
            <label style="${labelStyle}">${f.label}${reqStar}</label>
            <input style="${inputStyle}" type="file" name="${f.label}" ${reqAttr} ${focusScript}>
          </div>`;
      case 'multiselect':
        const multiselectOpts = (f.options || '').split(',').map(o =>
          `<option value="${o.trim()}">${o.trim()}</option>`).join('');
        return `
          <div>
            <label style="${labelStyle}">${f.label}${reqStar}</label>
            <select style="${inputStyle} height: auto; min-height: 80px;" name="${f.label}" multiple ${reqAttr} ${focusScript}>
              ${multiselectOpts}
            </select>
            <span style="font-size: 11px; color: #7c8b9a; margin-top: 4px; display: block;">Hold Ctrl (Cmd on Mac) to select multiple options</span>
          </div>`;
      case 'divider':
        return `
          <div style="margin: 12px 0 6px 0;">
            ${f.label ? `<span style="font-size: 13.5px; font-weight: 600; color: #15171a; display: block; margin-bottom: 8px;">${f.label}</span>` : ''}
            <hr style="border: none; border-top: 1px solid rgba(0, 0, 0, 0.08); margin: 0; width: 100%;">
          </div>`;
      default:
        return '';
    }
  }

  // Inject animations style
  if (!document.getElementById('fb-embed-styles')) {
    const style = document.createElement('style');
    style.id = 'fb-embed-styles';
    style.textContent = `
      @keyframes fbFadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderForms);
  } else {
    renderForms();
  }
})();
