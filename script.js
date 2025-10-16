document.addEventListener("DOMContentLoaded", () => {
  const cbzFileInput = document.getElementById("upload-input");
  const viewer = document.getElementById("viewer");
  const chapterNavigation = document.getElementById("chapter-nav");
  const chapterSelect = document.getElementById("chapter-select");
  const prevChapterButton = document.getElementById("chapter-prev");
  const nextChapterButton = document.getElementById("chapter-next");

  let intersectionObserver;
  let loadedCBZFiles = [];
  let currentChapterIndex = -1;
  let currentChapterObjectURLs = new Set();

  // ==============================
  // Utilidades
  // ==============================
  function setupIntersectionObserver() {
    if (intersectionObserver) intersectionObserver.disconnect();

    if (!("IntersectionObserver" in window)) {
      viewer.querySelectorAll("img[data-src]").forEach((img) => {
        img.src = img.dataset.src;
        img.removeAttribute("data-src");
      });
      return;
    }

    intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute("data-src");
            intersectionObserver.unobserve(img);
          }
        });
      },
      { rootMargin: "200px 0px 400px 0px", threshold: 0.01 }
    );
  }

  function cleanupPreviousChapter() {
    currentChapterObjectURLs.forEach((url) => URL.revokeObjectURL(url));
    currentChapterObjectURLs.clear();
    viewer.innerHTML = "";
  }

  function updateChapterNavigationUI() {
    if (currentChapterIndex === -1) return;
    chapterSelect.value = currentChapterIndex;
    prevChapterButton.disabled = currentChapterIndex === 0;
    nextChapterButton.disabled =
      currentChapterIndex === loadedCBZFiles.length - 1;
  }

  // ==============================
  // Processamento de arquivos CBZ (sem Web Worker)
  // ==============================
  async function processCBZFile(file) {
    try {
      const zip = await JSZip.loadAsync(file);
      const entries = [];
      
      // Coletar todas as entradas de imagem
      zip.forEach((path, entry) => {
        if (!entry.dir && /\.(jpe?g|png|gif|webp|avif)$/i.test(entry.name)) {
          entries.push(entry);
        }
      });

      // Ordenar as páginas numericamente
      entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      
      const total = entries.length;
      const fragment = document.createDocumentFragment();
      const imageURLs = [];

      // Processar cada imagem
      for (let i = 0; i < total; i++) {
        const blob = await entries[i].async("blob");
        const objectURL = URL.createObjectURL(blob);
        imageURLs.push(objectURL);
        currentChapterObjectURLs.add(objectURL);

        // Atualizar progresso
        const progress = Math.round(((i + 1) / total) * 100);
        const loadingElement = viewer.querySelector(".viewer__loading");
        if (loadingElement) {
          loadingElement.textContent = `Carregando... ${progress}%`;
        }

        // Criar elemento de imagem
        const img = document.createElement("img");
        img.dataset.src = objectURL;
        img.alt = entries[i].name;
        img.className = "viewer__page";
        img.loading = "lazy";
        img.decoding = "async";

        img.onerror = () => {
          img.alt = "Erro ao carregar imagem";
          img.classList.add("viewer__page--error");
        };

        fragment.appendChild(img);
        intersectionObserver.observe(img);

        // Inserir em lotes para melhor performance
        if (fragment.childNodes.length >= 3) {
          viewer.appendChild(fragment);
        }
      }

      // Inserir qualquer imagem restante
      if (fragment.childNodes.length > 0) {
        viewer.appendChild(fragment);
      }

      return imageURLs;
    } catch (error) {
      throw new Error(`Erro ao processar arquivo: ${error.message}`);
    }
  }

  // ==============================
  // Exibir Capítulo
  // ==============================
  async function displayChapter(chapterIndex) {
    if (chapterIndex < 0 || chapterIndex >= loadedCBZFiles.length) return;

    cleanupPreviousChapter();
    currentChapterIndex = chapterIndex;
    const file = loadedCBZFiles[chapterIndex];
    
    viewer.innerHTML = `<p class="viewer__loading">Extraindo ${file.name}...</p>`;
    setupIntersectionObserver();

    try {
      await processCBZFile(file);
      
      viewer.querySelector(".viewer__loading")?.remove();
      updateChapterNavigationUI();
      window.scrollTo({ top: 0, behavior: "smooth" });
      
    } catch (error) {
      viewer.innerHTML = `<p class="viewer__loading">Erro: ${error.message}</p>`;
    }
  }

  // ==============================
  // Capítulos e navegação
  // ==============================
  function populateChapterSelect() {
    const fragment = document.createDocumentFragment();
    loadedCBZFiles.forEach((file, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = file.name.replace(/\.cbz$/i, "");
      fragment.appendChild(option);
    });
    chapterSelect.replaceChildren(fragment);
    chapterNavigation.style.display = loadedCBZFiles.length ? "flex" : "none";

    if (loadedCBZFiles.length) displayChapter(0);
    else viewer.innerHTML = "<p>Selecione um ou mais arquivos CBZ.</p>";
  }

  cbzFileInput.addEventListener("change", (event) => {
    const files = Array.from(event.target.files || []);
    loadedCBZFiles = files.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true })
    );
    currentChapterIndex = -1;
    populateChapterSelect();
  });

  chapterSelect.addEventListener("change", () => {
    const idx = parseInt(chapterSelect.value);
    if (idx !== currentChapterIndex) displayChapter(idx);
  });

  const throttle = (func, limit) => {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  };

  prevChapterButton.addEventListener(
    "click",
    throttle(() => {
      if (currentChapterIndex > 0) displayChapter(currentChapterIndex - 1);
    }, 400)
  );

  nextChapterButton.addEventListener(
    "click",
    throttle(() => {
      if (currentChapterIndex < loadedCBZFiles.length - 1)
        displayChapter(currentChapterIndex + 1);
    }, 400)
  );

  window.addEventListener("beforeunload", () => {
    cleanupPreviousChapter();
    intersectionObserver?.disconnect();
  });

  function init() {
    if (!window.JSZip) {
      viewer.innerHTML = "<p>Erro: JSZip não encontrado.</p>";
      cbzFileInput.disabled = true;
      chapterNavigation.style.display = "none";
      return;
    }
    chapterNavigation.style.display = "none";
    console.log("Visualizador iniciado (sem Web Worker)");
  }

  init();
});
