/**
 * File: App.tsx
 * Author: Jakob Garcia
 * Description: This file implements the front end of my AI Snake project. 
 */
import { useState, useEffect, type JSX } from "react"

type GameState = {snake:number[], fruit:number, won:boolean, died:boolean}

type TableResult = {
  agent: string,
  gridSize: string,
  train: string,
  moveCount: number,
  fruitCount: number,
  finalLength: number,
  avgMove: string,
  outcome: string,
  replay: GameState[],
  agentCode: string,
  replaySize: number
}

// Shared Tailwind style groups for consistency and readability
const styles = {
  card: "rounded-2xl border border-black/10 bg-gray-400/70 shadow-lg",
  cardPadding: "py-5 px-8",
  label: "tracking-wide text-md",
  select: "bg-blue-200 rounded-sm pl-1",
  input: "bg-blue-200 rounded-sm pl-1",
  btnPrimary: "rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-sky-400 transition",
  btnSecondary: "rounded-lg bg-gray-300 px-3 py-2 text-sm font-medium text-black hover:bg-gray-200 transition",
  btnPrimarySm: "rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-400 transition",
  btnSlate: "rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 transition",
  sectionTitle: "text-lg font-semibold text-white",
  tableCell: "px-4 py-3 text-sm border-r border-black",
  tableCellLast: "px-4 py-3 text-sm",
  outcomeWon: "rounded-full px-3 py-1 ml-2 text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-500/40",
  outcomeLost: "rounded-full px-3 py-1 ml-2 text-xs font-semibold bg-rose-500/20 text-rose-200 border border-rose-500/40",
} as const


/**
 * Sends an API request to the backend to retrieve the steps to replay a simulated
 * game
 * @param agent a string of the agent model type 
 * @param eps the number of training episodes for the model
 * @param gridSize a number N representing the size of an NxN grid
 * @param seed a string number for random seeding
 * @returns A list of GameStates, where each item indicates one move the snake made.
 */
async function sendRequest(agent:string, eps:string, gridSize:number, seed:string): Promise<GameState[]> {
  const res = await fetch("https://ai-snake-agents-backend.onrender.com/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agent: agent,
      eps: eps,
      grid_size: gridSize,
      seed: seed
    })
  });

  const data = await res.json();
  return data.states;
}

/**
 * Pings the backend to wake it up/check if it is awake
 */
async function pingServer() {
  await fetch("https://ai-snake-agents-backend.onrender.com/ping", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ping: "ping"
    })
  });
}


/**
 * A helper function for determining the color of a snake square by 
 * calculating the hue, saturation, and lightness. 
 * @param index The position from the head of the body part being colored
 * @param maxScale The maximum snake size (the size of the grid)
 * @returns a string of the proper color
 */
function snakeColor(index: number, maxScale: number): string {
  // clamp for safety
  const t = Math.max(0, Math.min(1, (maxScale - index) / maxScale))

  // Dark blue to light blue
  const hue = 210       // blue
  const saturation = 90 // %
  const lightnessMin = 30
  const lightnessMax = 90

  const lightness =
    lightnessMin + t * (lightnessMax - lightnessMin)

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

/**
 * This function creates the model selectors for the agents, including selectors
 * and text input. 
 * @param agent a string of the current model type 
 * @param eps the number of training episodes for the model
 * @param seed a string number for random seeding
 * @param setAgent a setState function for the agent variable
 * @param setEps a setState function for the eps variable
 * @param setSeed a setState function for the seed variable
 * @param resetBoard an anonymous function for clearing the board and related states/variables
 * @returns JSX elements for this component
 */
function ModelSelect({agent, eps, seed, setAgent, setEps, setSeed, resetBoard}:
      {agent:string, 
      eps:string,
      seed:string,
      setAgent:React.Dispatch<React.SetStateAction<string>>,
      setEps:React.Dispatch<React.SetStateAction<string>>,
      setSeed:React.Dispatch<React.SetStateAction<string>>,
      resetBoard:()=>void}): JSX.Element {

  // Set default episode count when switching agent types
  useEffect(() => {
    if (agent === "a*") setEps("N/A");
    else if (agent.includes("deep") && !["1k", "3k", "5k"].includes(eps)) setEps("1k");
    else if (!["50k", "75k", "100k"].includes(eps)) setEps("50k");
  }, [agent]);

  // Restrict the seed inputs to numerical values from [0, 999]
  const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = e.target.value;
    if (value === '') {
      setSeed('');
      return;
    }
    // digits only (blocks '-', 'e', '.')
    if (!/^\d+$/.test(value)) {return;}
     // no leading zeros (except "0")
    if (value.length > 1 && value.startsWith('0')) {return;}
    
    const n = Number(value);
    if (n > 999) {
      e.target.value = seed;
      return;
    }
    setSeed(value);
  };


  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {/* Model Selection */}
        <label htmlFor="agent-type" className={styles.label}>Select Agent:</label>
        <select className={styles.select} id="agent-type" value={agent} onChange={(e) => { resetBoard(); setAgent(e.target.value); }}>
          <option value="a*">A* Agent</option>
          {/* Temporarily commented out as tabular model was too large for server and needs to be made smaller */}
          {/* <option value="ql">Q-Learning Agent</option> */}
          <option value="apx-ql">Approx. QL Agent</option>
          <option value="deep-ql">Deep QL Agent</option>
        </select>

        {/* Episode Count Selection */}
        <label htmlFor="episode-count" className={styles.label}>Training Amount:</label>
        {/* A* does not use training; deep agents use less training */}
        {agent === "a*" ? (
          <p>N/A</p>
        ) : (
          <select className={styles.select} id="episode-count" value={eps} onChange={(e) => { resetBoard(); setEps(e.target.value); }}>
            {agent.includes("deep") ? (
              <>
                <option value="1k">1k eps</option>
                <option value="3k">3k eps</option>
                <option value="5k">5k eps</option>
              </>
            ) : (
              <>
                <option value="50k">50k eps</option>
                <option value="75k">75k eps</option>
                <option value="100k">100k eps</option>
              </>
            )}
          </select>
        )}

        {/* Optional Seed Input */}
        <label htmlFor="seed-input" className={styles.label}>Seed Value:</label>
        <input type="text" inputMode="numeric" value={seed} className={styles.input} id="seed-input" placeholder="0-999" onChange={onChange} />
      </div>
    </>
  );
}

/**
 * This function creates the grid that displays the simulated snake game. 
 * @param gridSize a number N representing the size of an NxN grid
 * @param timeStep the current time *s* of the *s-th* step taken by the snake 
 * @param gameStates the array of states the snake will take for a given simulation
 * @returns JSX elements for this component
 */
function Grid({ gridSize, timeStep, gameStates }: { gridSize: number; timeStep: number; gameStates: GameState[] }): JSX.Element {
  const [grid, setGrid] = useState<JSX.Element[]>([]);

  // When 2 grids are used and one game ends early, freeze on the last move
  const effectiveStep = timeStep >= gameStates.length ? gameStates.length - 1 : timeStep;

  // Determine the color a given square should have
  const cellClass = (i: number) => {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    const isWall = row === 0 || row === gridSize - 1 || col === 0 || col === gridSize - 1;
    if (isWall) return "bg-black border-cyan-700/80";
    const isFruit = gameStates.length > 0 && i === gameStates[effectiveStep].fruit; 
    if (isFruit) return "bg-red-500";
    return i % 2 ? "bg-green-500/90" : "bg-green-300";
  };

  // Depict the current game state onto the grid, coloring the snake and everything else
  const generateGrid = () => {
    const maxSnake = (gridSize - 2) * (gridSize - 2);
    const snakeColors = Array.from({ length: maxSnake }, (_, i) => snakeColor(i + 1, maxSnake)).reverse();
    return Array.from({ length: gridSize * gridSize }, (_, i) => {
      const snakeIndex = gameStates.length === 0 ? -1 : gameStates[effectiveStep].snake.indexOf(i);
      return (
        <div
          key={i}
          className={`w-8 border aspect-square ${cellClass(i)}`}
          style={snakeIndex !== -1 ? { backgroundColor: snakeColors[snakeIndex] } : undefined}
        />
      );
    });
  };

  useEffect(() => { // regenerate grid every time the size or time changes
      setGrid(generateGrid());
  }, [gridSize, timeStep, gameStates]);

  const gridStats = "pl-4 -mt-4 pb-2";
  const fruitCount = gameStates.length === 0 ? 0 : gameStates[effectiveStep].snake.length - 1;

  return (
    <>
      {/* The grid itself */}
      <div>
        <div className="grid p-4" style={{gridTemplateColumns: `repeat(${gridSize}, 2rem)`}}>
          {grid}
        </div>
        <p className={gridStats}>Moves: {effectiveStep}</p>
        <p className={gridStats}>Fruits: {fruitCount}</p>
      </div>
    </>
  );
}

export default function App() {
  const [gridSize, setGridSize] = useState<number>(5);
  const [twoGrids, setTwoGrids] = useState<boolean>(false);

  const [gameStates1, setGameStates1] = useState<GameState[]>([]); 
  const [gameStates2, setGameStates2] = useState<GameState[]>([]); 
  const [agent1, setAgent1] = useState<string>("a*");
  const [agent2, setAgent2] = useState<string>("a*");
  const [eps1, setEps1] = useState<string>("N/A");
  const [eps2, setEps2] = useState<string>("N/A");
  const [seed1, setSeed1] = useState<string>('');
  const [seed2, setSeed2] = useState<string>('');

  const [playing, setPlaying] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1); // 1x, 2x, 4x
  const [tableRes, setTableRes] = useState<TableResult[]>([]); 
  const [timeStep, setTimeStep] = useState<number>(0);
  const [serverAwake, setServerAwake] = useState<boolean>(false);

  const nameMap: Record<string, string> = {
    "a*" : "A*",
    "ql" : "Q-Learning",
    "apx-ql" : "Approx. QL",
    "deep-ql" : "Deep QL"
  }

  // Wake up the server on first boot
  useEffect(() => {
    const ping = async () =>{await pingServer();}
    ping();
    setServerAwake(true);
  }, []);
  
  useEffect(() => { // play the snake moves with the play button
    if (!playing || gameStates1.length === 0) {
      setPlaying(false);
      return;
    }
    const intervalMs = 500 / speed;
    // auto loop the snake
    const id = setInterval(() => {
      setTimeStep(prev => {
        if (prev >= Math.max(gameStates1.length, gameStates2.length) - 1) {
          setPlaying(false);
          return prev; // time ended
        }
        return prev + 1;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [playing, speed]);


  const createTableResult = (agent:string, eps:string, endIndex:number, data:GameState[]):TableResult => {
   return {
      agent: nameMap[agent],
      gridSize: (gridSize-2)+"x"+(gridSize-2),
      train: eps,
      moveCount: endIndex,
      fruitCount: data[endIndex].snake.length-1,
      finalLength: data[endIndex].snake.length,
      avgMove: (endIndex/((data[endIndex].snake.length-1)+1e-9)).toFixed(3),
      outcome: data[endIndex].won ? "Won" : "Lost",
      replay: [...data],
      agentCode : agent,
      replaySize : gridSize
    }; 
  }

  // Send a request to load a new game and then display the grid and start running
  const loadNewGame = async () => { 
    setLoading(true);
    // Race condition here where we can load something, and then while loading switch grids, and then it still runs.
    const data1 = await sendRequest(agent1,eps1,gridSize-2,seed1);
    const endIndex1 = data1.length-1
    const result1: TableResult = createTableResult(agent1, eps1, endIndex1, data1)
    setTableRes(t => [result1,...t])

    if(twoGrids) {
      const data2 = await sendRequest(agent2,eps2,gridSize-2,seed2);
      const endIndex2 = data2.length-1
      const result2: TableResult = createTableResult(agent2, eps2, endIndex2, data2)
      setTableRes(t => [result2,...t])
      setGameStates2(data2);
    }
    setGameStates1(data1);
    setLoading(false);
    setTimeStep(0);
    setPlaying(true);
  };

  const resetBoard = () => { // Clear all states
    setPlaying(false);
    setLoading(false);
    setGameStates1([]);
    setGameStates2([]);
    setTimeStep(0);
  };

  const maxStep = Math.max(gameStates1.length, gameStates2.length) - 1;
  const canStepForward = timeStep < maxStep;

  return (
    <div className="bg-gray-400/40">
      {/* Header */}
      <header className="bg-cyan-700/80 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-2">
          <div>
            <p className="text-2xl font-semibold text-white">AI Snake Agents</p>
            <p className="text-sm text-slate-200">Run, compare, and replay agent simulations.</p>
          </div>
          {/* Indicate if server is up or down */}
          <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            Server Status: {serverAwake ? "Live" : "Sleeping"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl pb-8 mt-4">
        {/* Model selection options above the grid */}
        <section className="grid grid-cols-5 grid-rows-2 gap-4">
          <div className={`${styles.card} ${styles.cardPadding} row-span-2 col-span-2`}>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <h2 className={styles.sectionTitle}>Grid 1</h2>
            </div>
            <ModelSelect agent={agent1} eps={eps1} setAgent={setAgent1} setEps={setEps1} seed={seed1} setSeed={setSeed1} resetBoard={resetBoard} />
          </div>

          {/* Grid size Selector */}
          <div className={`${styles.card} row-start-2 col-start-3 max-h-15 p-5`}>
            <label htmlFor="grid-size" className={styles.label}>Grid Size:</label>
            {/* size + 2 to include the walls when rendering */}
            <select className={`${styles.select} ml-2 w-24`} id="grid-size" value={gridSize} onChange={(e) => 
                { resetBoard(); setGridSize(parseInt(e.target.value)); }}>
              <option value={5}>3x3</option>
              <option value={7}>5x5</option>
              <option value={9}>7x7</option>
            </select>
          </div>

          {/* Second Model selection */}
          <div className={`${styles.card} ${styles.cardPadding} row-span-2 col-span-2`}>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-sky-400" />
              <h2 className={styles.sectionTitle}>Grid 2</h2>
            </div>
            {twoGrids ? (
              <ModelSelect agent={agent2} eps={eps2} setAgent={setAgent2} setEps={setEps2} seed={seed2} setSeed={setSeed2} resetBoard={resetBoard} />
            ) : (
              <p className={styles.label}>Add a grid to enable the second agent</p>
            )}
          </div>
        </section>

        {/* The grids themselves */}
        <section className="flex items-end justify-around rounded-lg border border-black/10 bg-gray-400/70 p-2 mt-2 mb-2 shadow-lg">
          <Grid gridSize={gridSize} timeStep={timeStep} gameStates={gameStates1} />
          
          {/* Loading message that displays over the grid */}
          <p className={`absolute mb-30 bg-red-400/85 p-1 ${!loading && "hidden"}`}>Loading...</p>
          
          {twoGrids && <Grid gridSize={gridSize} timeStep={timeStep} gameStates={gameStates2} />}
        </section>

        {/* Player controls */}
        <section className="p-1">
          <div className="flex justify-center">
            <div className="flex flex-col items-center gap-2 rounded-2xl border bg-cyan-900/80 py-2 px-4 shadow-xl">
              <button className={styles.btnPrimary} onClick={() => loadNewGame()}>Run new game</button>
              <div className="flex gap-2">
                <button className={styles.btnSecondary} onClick={() => { setPlaying(false); setTimeStep((t) => (t > 0 ? t - 1 : t)); }}>Back</button>
                {canStepForward ? (
                  <button className={styles.btnSecondary} onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "Play"}</button>
                ) : (
                  <button className={styles.btnPrimary} onClick={() => { setPlaying(false); setTimeStep(0); }}>Restart</button>
                )}
                <button
                  className={styles.btnSecondary}
                  onClick={() => { setPlaying(false); setTimeStep((t) => (t < maxStep ? t + 1 : t)); }}
                >Forward</button>
                <button className={styles.btnSecondary} onClick={() => setSpeed((s) => (s === 4 ? 1 : s * 2))}>{speed}x Speed</button>
                <button className={styles.btnSecondary} onClick={() => { resetBoard(); setTwoGrids((t) => !t); }}>{twoGrids ? "Remove" : "Add"} Grid</button>
              </div>
            </div>
          </div>
        </section>
        
        {/* Results table */}
        <section className={`${styles.card} mt-2 p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className={styles.sectionTitle}>Simulation history</h3>
            <span className="text-xs text-white/80">Newest first</span>
          </div>
          <div className="max-h-95 overflow-y-auto">
            <table className="min-w-full mb-4 border border-black text-white">
              <thead>
                <tr className="divide-x bg-gray-200 text-xs uppercase tracking-wide text-black">
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Grid Size</th>
                  <th className="px-4 py-3">Train Episodes</th>
                  <th className="px-4 py-3">Move Count</th>
                  <th className="px-4 py-3">Fruit Count</th>
                  <th className="px-4 py-3">Final Length</th>
                  <th className="px-4 py-3">Avg. Moves Per Fruit</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">Replay?</th>
                </tr>
              </thead>
              {/* Table rows */}
              <tbody className="divide-y divide-white/5 bg-cyan-900/80">
                {tableRes.map((res, i) => (
                  <tr key={String(i)} className={`divide-x ${i % 2 ? "bg-slate-500/50" : ""}`}>
                    <td className={styles.tableCell}>{res.agent}</td>
                    <td className={styles.tableCell}>{res.gridSize}</td>
                    <td className={styles.tableCell}>{res.train}</td>
                    <td className={styles.tableCell}>{res.moveCount}</td>
                    <td className={styles.tableCell}>{res.fruitCount}</td>
                    <td className={styles.tableCell}>{res.finalLength}</td>
                    <td className={styles.tableCell}>{res.avgMove}</td>
                    <td className={styles.tableCell}>
                      <span className={res.outcome === "Won" ? styles.outcomeWon : styles.outcomeLost}>
                        {res.outcome}
                      </span>
                    </td>
                    {/* Replay Buttons */}
                    <td className={styles.tableCellLast}>
                      <div className="flex gap-2">
                        <button
                          className={styles.btnPrimarySm}
                          onClick={() => {
                            setPlaying(false);
                            if (gridSize !== res.replaySize) setGameStates2(res.replay);
                            setGridSize(res.replaySize);
                            setAgent1(res.agentCode);
                            setEps1(res.train);
                            setGameStates1(res.replay);
                            setTimeStep(0);
                          }}
                        >Grid 1</button>
                        <button
                          className={styles.btnSlate}
                          onClick={() => {
                            setPlaying(false);
                            if (gridSize !== res.replaySize) setGameStates1(res.replay);
                            setGridSize(res.replaySize);
                            setTwoGrids(true);
                            setAgent2(res.agentCode);
                            setEps2(res.train);
                            setGameStates2(res.replay);
                            setTimeStep(0);
                          }}
                        >Grid 2</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}


