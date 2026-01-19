export function createChartConfig() {
    return {
        type: "bar",
        data: {
            labels: ["Q1", "Q2", "Q3", "Q4"],
            datasets: [
                {
                    label: "Mock revenue",
                    data: [12, 19, 7, 14],
                    backgroundColor: "#2563eb"
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "bottom"
                },
                title: {
                    display: true,
                    text: "Mock Chart.js Output"
                }
            }
        }
    };
}
