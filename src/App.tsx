import { useState, useEffect, type JSX } from 'react'

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
  agentCode : string,
  replaySize : number
}

function snakeColor(index: number, maxScale: number) {
  // clamp for safety
  const t = Math.max(0, Math.min(1, (maxScale - index) / maxScale))

  // Dark -> Light blue
  const hue = 210        // blue
  const saturation = 90 // %
  const lightnessMin = 30
  const lightnessMax = 90

  const lightness =
    lightnessMin + t * (lightnessMax - lightnessMin)

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

async function sendRequest(agent:string, eps:string, gridSize:number, seed:string): Promise<GameState[]> {
  const res = await fetch("http://localhost:8000/simulate", {
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


function ModelSelect({agent, eps, seed, setAgent, setEps, setSeed, resetBoard}:
      {agent:string, 
      eps:string,
      seed:string,
      setAgent:React.Dispatch<React.SetStateAction<string>>,
      setEps:React.Dispatch<React.SetStateAction<string>>,
      setSeed:React.Dispatch<React.SetStateAction<string>>,
      resetBoard:()=>void}) {

  useEffect(() => { // set default episode counts when switching agents
    if(agent == "a*") {
      setEps("N/A");
    } else if(agent.includes("deep") && !["1k", "3k", "5k"].includes(eps)) {
      setEps("1k");
    } else if (!["50k", "75k", "100k"].includes(eps))
      setEps("50k");
  }, [agent]);


  const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = e.target.value;

    if (value === '') {
      setSeed('');
      return;
    }

    // digits only (blocks '-', 'e', '.')
    if (!/^\d+$/.test(value)) {
      return;
    }

     // no leading zeros (except "0")
    if (value.length > 1 && value.startsWith('0')) {
      return;
    }

    const n = Number(value);
    if (n > 999) {
      e.target.value = seed;
      return;
    }
    setSeed(value);
  };


  return (
    <>
      {/* Model Selection */}
      <div className="grid grid-cols-2 gap-2 ">
        <label htmlFor="agent-type">Select Agent:</label>
        <select className="bg-blue-200" id="agent-type" value={agent} onChange={(e) => {resetBoard();setAgent(e.target.value)}}>
          <option value={"a*"}>A* Agent</option>
          <option value={"ql"}>Q-Learning Agent</option>
          <option value={"apx-ql"}>Approx. QL Agent</option>
          <option value={"deep-ql"}>Deep QL Agent</option>
        </select> 

        <label htmlFor="episode-count">Training Amount:</label>
        {/* A* does not use training; deep agents use less training */}
        {agent == 'a*' ? <p>N/A</p> :  
        <select className="bg-blue-200" id="episode-count" value={eps} onChange={(e) => {resetBoard();setEps(e.target.value)}}>
          {agent.includes("deep") ?
            <> 
              <option value={"1k"}>1k eps</option>
              <option value={"3k"}>3k eps</option>
              <option value={"5k"}>5k eps</option>
            </> :
            <>
              <option value={"50k"}>50k eps</option>
              <option value={"75k"}>75k eps</option>
              <option value={"100k"}>100k eps</option>
            </>} 
        </select>}
        
        <label htmlFor='seed-input'>Seed Value:</label>
        <input type="text" inputMode='numeric' value={seed} className='bg-blue-200'
            id="seed-input" placeholder='0-999' onChange={onChange}></input>
      </div>
    </>
  );
}


function Grid({gridSize, timeStep, gameStates,}: 
    {gridSize:number, timeStep:number, gameStates:GameState[]}) {
  const [grid, setGrid] = useState<JSX.Element[]>([]);

  // When 2 grids are used and one game ends early, freeze on the last move
  if(timeStep >= gameStates.length) { 
    timeStep = gameStates.length-1;
  }

  const colorCoord = (i:number) => {
    const quot = Math.floor(i/gridSize);
    const modu = i % gridSize;
    const isWall = quot == 0 || quot == (gridSize-1) || modu == 0 || modu == (gridSize-1) ? "bg-black border-indigo-500" : "";
    const grassColor = i % 2 ? "bg-green-500" : "bg-green-200";
    const isFruit = gameStates.length != 0 && i == gameStates[timeStep].fruit ? "bg-red-500" : "";
    return isWall || isFruit || grassColor;
  }

  const generateGrid = () => { 
    const maxSnake = (gridSize-2)*(gridSize-2);
    const snakeColors = Array.from({length : maxSnake}, (_,i)=>snakeColor(i+1, maxSnake)).reverse();
    const grid = Array.from({length : gridSize*gridSize}, (_,i)=> {
      const snakeIndex = gameStates.length == 0 ? -1 : gameStates[timeStep].snake.indexOf(i);
      return <div key={i} className={`w-8 border aspect-square ${colorCoord(i)}`} 
                  style={snakeIndex != -1 ? {backgroundColor : snakeColors[snakeIndex]} : undefined}></div>
    });
    return grid;
  }

  useEffect(() => { // regenerate grid every time the size or time changes
      setGrid(generateGrid());
  }, [gridSize, timeStep, gameStates]);

  return(
    <>
      {/* The grid itself */}
      <div>
        <div className="grid p-4" style={{gridTemplateColumns: `repeat(${gridSize}, 2rem)`}}> {/*tailwind can't dynamically change this*/}
          {grid}
        </div>
        <p className='pl-4 -mt-4 pb-2'>Moves: {timeStep}</p>
        <p className='pl-4 -mt-4 pb-2'>Fruits: {gameStates.length == 0 ? 0 : gameStates[timeStep].snake.length-1}</p>
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

  const nameMap: Record<string, string> = {
    "a*" : "A*",
    "ql" : "Q-Learning",
    "apx-ql" : "Approx. QL",
    "deep-ql" : "Deep QL"
  }
  
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

  const createTableResult = (agent:string, eps:string, endIndex:number, data:GameState[]) => {
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

  const resetBoard = () => {
    setPlaying(false);
    setLoading(false);
    setGameStates1([]);
    setGameStates2([]);
    setTimeStep(0);
  };

  return (
    <>
      {/* Header */}
      <div className="bg-red-300 p-2">
        <p className="text-xl font-semibold">
          AI Snake Agents
        </p>
      </div>
      
      <div className="justify-items-center mt-8">
        {/* Model selection options above the grid */}
        <div className="flex items-end gap-32">
          <ModelSelect agent={agent1} eps={eps1} setAgent={setAgent1} setEps={setEps1} seed={seed1} setSeed={setSeed1} resetBoard={resetBoard}/>          
          {
            twoGrids && <ModelSelect agent={agent2} eps={eps2} setAgent={setAgent2} setEps={setEps2} seed={seed2} setSeed={setSeed2} resetBoard={resetBoard}/>
          }
        </div>
      
        {/* Grid size selector */}
        <div className='pt-2'>
          <label htmlFor="grid-size">Grid Size:</label>
          <select className="bg-blue-200 ml-2 w-32" id="grid-size" value={gridSize}
              onChange={(e) => {resetBoard();setGridSize(parseInt(e.target.value))}}>
            {/* size + 2 to include the walls when rendering */}
            <option value={5}>3x3</option>
            <option value={7}>5x5</option>
            <option value={9}>7x7</option>
          </select>
        </div>
        
        <p className={`bg-red-400/85 absolute mt-20 p-1 ${!loading && 'hidden'}`}>Loading...</p>
        {/* The grids themselves */}
        <div className="flex items-end gap-32">
          <Grid gridSize={gridSize} timeStep={timeStep} gameStates={gameStates1}/>
          {
            twoGrids && <Grid gridSize={gridSize} timeStep={timeStep} gameStates={gameStates2}/>
          }
        </div>

        {/* Player controls */}
        <div>
          <button className="bg-gray-200 mb-2" onClick={() => loadNewGame()}>Run new game</button>
        </div>
        <div className="flex items-center gap-2">
          <button className="bg-gray-200" onClick={() => {setPlaying(false);setTimeStep(t => t>0 ? t-1 : t);}}>back</button>
          {
            timeStep < (Math.max(gameStates1.length, gameStates2.length)-1) 
            ? 
            <button className="bg-gray-200" onClick={() => setPlaying(p => !p)}>play/pause</button> 
            :
            <button className="bg-gray-200" onClick={() => {setPlaying(false);setTimeStep(0);}}>restart</button>
          }
          
          <button className="bg-gray-200" 
              onClick={() => {setPlaying(false);
                              setTimeStep(t => t<(Math.max(gameStates1.length, gameStates2.length)-1) ? t+1 : t);
                              }}>forward</button>
          <button className="bg-gray-200" onClick={() => setSpeed(s => s == 4 ? 1 : s*2)}>{speed}x Speed</button>
          <button className="bg-gray-200" onClick={() => {resetBoard();setTwoGrids(t => !t)}}>add/remove grid</button>
        </div>
        
        {/* Results table */}
        <table className="w-7/10 border border-collapse border-black mt-8 mb-10">
          <thead>
            <tr className='bg-gray-200 divide-x'>
              <th>Agent</th>
              <th>Grid Size</th>
              <th>Train Episodes</th>
              <th>Move Count</th>
              <th>Fruit Count</th>
              <th>Final Length</th>
              <th>Avg. Moves Per Fruit</th>
              <th>Outcome</th>
              <th>Replay?</th>
            </tr>
          </thead>
          <tbody>
            {
              tableRes.map((res, i) => {
                return ( 
                  <tr key={i+""} className={`divide-x ${i%2 ? "bg-gray-200" : ""}`}>
                    <td>{res.agent}</td>
                    <td>{res.gridSize}</td>
                    <td>{res.train}</td>
                    <td>{res.moveCount}</td>
                    <td>{res.fruitCount}</td>
                    <td>{res.finalLength}</td>
                    <td>{res.avgMove}</td>
                    <td>{res.outcome}</td>
                    {/* I can add more complicated replay logic, but that comes with checking grid size matches */}
                    <td>
                      <button className='bg-blue-400 text-white px-4 w-1/2 border border-black' 
                        onClick={() => {
                          setPlaying(false);
                          if(gridSize != res.replaySize) { // if there is a replay mismatch, overwrite other grid
                            setGameStates2(res.replay);
                          }
                          setGridSize(res.replaySize);
                          setAgent1(res.agentCode);
                          setEps1(res.train);
                          setGameStates1(res.replay);
                          setTimeStep(0);
                          }}
                      >Grid 1</button>
                      <button className='bg-blue-400 text-white px-4 w-1/2 border border-black' 
                        onClick={() => {
                          setPlaying(false);
                          if(gridSize != res.replaySize) { // if there is a replay mismatch, overwrite other grid
                            setGameStates1(res.replay);
                          }
                          setGridSize(res.replaySize);
                          setTwoGrids(true);
                          setAgent2(res.agentCode);
                          setEps2(res.train);
                          setGameStates2(res.replay);
                          setTimeStep(0);
                          }}
                      >Grid 2</button>
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>
    </>
  )
}


