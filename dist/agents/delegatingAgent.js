import { Annotation, StateGraph, END, START } from "@langchain/langgraph";
import { callChatModel } from "../clients/llm.js";
import { ragAgent } from "./ragAgent.js";
import { createChartConfig } from "./chartTool.js";
const DelegationState = Annotation.Root({
    query: Annotation(),
    route: Annotation(),
    answer: Annotation(),
    data: Annotation()
});
function pickRoute(query) {
    const text = query.toLowerCase();
    const wantsChart = /chart|graph|plot|visual/.test(text);
    const wantsRag = /document|file|page|source|reference|rag|weaviate|database|policy|handbook|manual|guide/.test(text);
    const wantsBoth = wantsChart && wantsRag;
    const wantsSequential = /then|after|sequential|first/.test(text);
    if (wantsBoth && wantsSequential) {
        return "both_sequential";
    }
    if (wantsBoth) {
        return "both_parallel";
    }
    if (wantsChart) {
        return "chart";
    }
    if (wantsRag) {
        return "rag";
    }
    return "direct";
}
async function routerNode(state) {
    return {
        route: pickRoute(state.query)
    };
}
async function directNode(state) {
    let answer = "";
    let llmUsed = true;
    try {
        answer = await callChatModel("You are a concise assistant. Answer clearly and briefly.", state.query);
    }
    catch (error) {
        llmUsed = false;
        answer = "I can help once the LLM is configured.";
    }
    return {
        answer,
        data: [
            {
                type: "direct_answer",
                llmUsed
            }
        ]
    };
}
async function chartNode() {
    const chartConfig = createChartConfig();
    return {
        answer: "Generated a mocked Chart.js configuration.",
        data: [
            {
                type: "chartjs_config",
                config: chartConfig
            }
        ]
    };
}
async function ragNode(state) {
    return ragAgent(state.query);
}
async function bothParallelNode(state) {
    const [ragResult, chartConfig] = await Promise.all([
        ragAgent(state.query),
        Promise.resolve(createChartConfig())
    ]);
    return {
        answer: `${ragResult.answer}\n\nChart config ready as requested.`,
        data: [
            ...ragResult.data,
            {
                type: "chartjs_config",
                config: chartConfig
            }
        ]
    };
}
async function bothSequentialNode(state) {
    const ragResult = await ragAgent(state.query);
    const chartConfig = createChartConfig();
    return {
        answer: `First, the retrieved answer: ${ragResult.answer}\n\nThen the chart config is ready.`,
        data: [
            ...ragResult.data,
            {
                type: "chartjs_config",
                config: chartConfig
            }
        ]
    };
}
const graph = new StateGraph(DelegationState)
    .addNode("router", routerNode)
    .addNode("direct", directNode)
    .addNode("chart", chartNode)
    .addNode("rag", ragNode)
    .addNode("both_parallel", bothParallelNode)
    .addNode("both_sequential", bothSequentialNode)
    .addEdge(START, "router")
    .addConditionalEdges("router", (state) => state.route, {
    direct: "direct",
    chart: "chart",
    rag: "rag",
    both_parallel: "both_parallel",
    both_sequential: "both_sequential"
})
    .addEdge("direct", END)
    .addEdge("chart", END)
    .addEdge("rag", END)
    .addEdge("both_parallel", END)
    .addEdge("both_sequential", END)
    .compile();
export async function runDelegatingAgent(query) {
    return graph.invoke({
        query,
        data: [],
        answer: "",
        route: ""
    });
}
function chunkText(text, size) {
    if (!text) {
        return [""];
    }
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + size, text.length);
        let slice = text.slice(start, end);
        if (end < text.length) {
            const lastSpace = slice.lastIndexOf(" ");
            if (lastSpace > 40) {
                slice = slice.slice(0, lastSpace);
                start += lastSpace + 1;
            }
            else {
                start = end;
            }
        }
        else {
            start = end;
        }
        chunks.push(slice.trim());
    }
    return chunks.filter((chunk) => chunk.length > 0);
}
export async function* streamDelegatingAgent(query, options = {}) {
    const result = await runDelegatingAgent(query);
    const chunkSize = options.chunkSize || 120;
    const chunks = chunkText(result.answer, chunkSize);
    if (chunks.length === 0) {
        yield { answer: "", data: result.data || [] };
        return;
    }
    for (let i = 0; i < chunks.length; i += 1) {
        const isLast = i === chunks.length - 1;
        yield {
            answer: chunks[i],
            data: isLast ? result.data || [] : []
        };
    }
}
