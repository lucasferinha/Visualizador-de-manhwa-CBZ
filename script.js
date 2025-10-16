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
  let isProcessing = false;

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
    isProcessing = false;
  }

  function updateChapterNavigationUI() {
    if (currentChapterIndex === -1) return;
    chapterSelect.value = currentChapterIndex;
    prevChapterButton.disabled = currentChapterIndex === 0;
    nextChapterButton.disabled =
      currentChapterIndex === loadedCBZFiles.length - 1;
  }

  // ==============================
  // Processamento de arquivos CBZ (com yield para não travar)
  // ==============================
  async function* processCBZFileGenerator(file) {
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

      for (let i = 0; i < total; i++) {
        // Permitir que a interface responda a cada imagem
        if (i % 3 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        const blob = await entries[i].async("blob");
        const objectURL = URL.createObjectURL(blob);
        
        yield {
          objectURL,
          name: entries[i].name,
          progress: (i + 1) / total,
          index: i,
          total
        };
      }
    } catch (error) {
      throw new Error(`Erro ao processar arquivo: ${error.message}`);
    }
  }

  // ==============================
  // Exibir Capítulo (com processamento incremental)
  // ==============================
  async function displayChapter(chapterIndex) {
    if (chapterIndex < 0 || chapterIndex >= loadedCBZFiles.length || isProcessing) return;

    cleanupPreviousChapter();
    currentChapterIndex = chapterIndex;
    const file = loadedCBZFiles[chapterIndex];
    
    viewer.innerHTML = `<p class="viewer__loading">Extraindo ${file.name}...</p>`;
    setupIntersectionObserver();

    isProcessing = true;
    const fragment = document.createDocumentFragment();

    try {
      const processor = processCBZFileGenerator(file);
      let result = await processor.next();

      while (!result.done && isProcessing) {
        const { objectURL, name, progress, index, total } = result.value;
        
        currentChapterObjectURLs.add(objectURL);

        // Atualizar progresso
        const pct = Math.round(progress * 100);
        const loadingElement = viewer.querySelector(".viewer__loading");
        if (loadingElement) {
          loadingElement.textContent = `Carregando... ${pct}% (${index + 1}/${total})`;
        }

        // Criar elemento de imagem
        const img = document.createElement("img");
        img.dataset.src = objectURL;
        img.alt = name;
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
        if (fragment.childNodes.length >= 2) {
          viewer.appendChild(fragment);
        }

        // Processar próxima imagem
        result = await processor.next();
      }

      // Inserir imagens restantes
      if (fragment.childNodes.length > 0) {
        viewer.appendChild(fragment);
      }

      if (isProcessing) {
        viewer.querySelector(".viewer__loading")?.remove();
        updateChapterNavigationUI();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

    } catch (error) {
      if (isProcessing) {
        viewer.innerHTML = `<p class="viewer__loading">Erro: ${error.message}</p>`;
      }
    } finally {
      isProcessing = false;
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
      if (currentChapterIndex > 0 && !isProcessing) displayChapter(currentChapterIndex - 1);
    }, 400)
  );

  nextChapterButton.addEventListener(
    "click",
    throttle(() => {
      if (currentChapterIndex < loadedCBZFiles.length - 1 && !isProcessing)
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
    console.log("Visualizador iniciado com processamento incremental");
  }

  init();
});
