const form = document.getElementById("uploadForm");
const loading = document.getElementById("loading");
const resultados = document.getElementById("resultados");
const tabelaResultados = document.getElementById("tabelaResultados");
const historico = document.getElementById("historico");
const listaHistorico = document.getElementById("listaHistorico");
const toggleTheme = document.getElementById("toggleTheme");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  loading.style.display = "block";

  // Simulação de processamento
  setTimeout(() => {
    loading.style.display = "none";
    resultados.style.display = "block";
    historico.style.display = "block";

    tabelaResultados.innerHTML = `
      <tr><td>3870010300013</td><td>IRACILDA TERESA</td><td>1429264187</td><td>AUDI</td></tr>
      <tr><td>3870010300014</td><td>JOÃO CARLOS</td><td>12345678900</td><td>NAUD</td></tr>
    `;

    const data = new Date().toLocaleString("pt-BR");
    const item = document.createElement("li");
    item.classList.add("list-group-item");
    item.textContent = `Upload realizado em ${data}`;
    listaHistorico.prepend(item);
  }, 2500);
});

toggleTheme.addEventListener("click", () => {
  document.body.classList.toggle("light");
  const icon = toggleTheme.querySelector("i");
  icon.classList.toggle("bi-moon-fill");
  icon.classList.toggle("bi-sun-fill");
});
