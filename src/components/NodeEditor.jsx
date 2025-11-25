import React, { useEffect, useRef } from 'react';
import { useStore } from '../store';

const NODE_TYPES = {
    INPUT: { color: '#4a90e2', inputs: [], outputs: ['Val'] },
    MATH: { color: '#f5a623', inputs: ['A', 'B'], outputs: ['Out'] },
    OUTPUT: { color: '#7ed321', inputs: ['Val'], outputs: [] }
};

class Node {
    constructor(id, type, name, x, y) {
        this.id = id;
        this.type = type;
        this.name = name;
        this.x = x;
        this.y = y;
        this.w = 120;
        this.h = 80;
        this.inputs = [];
        this.outputs = [];
        this.value = 0;
        this.params = {};
        
        NODE_TYPES[type].inputs.forEach((label, i) => {
            this.inputs.push({ label, localPos: {x: 0, y: 30 + i * 20}, connectedTo: null });
        });
        NODE_TYPES[type].outputs.forEach((label, i) => {
            this.outputs.push({ label, localPos: {x: 120, y: 30 + i * 20}, connections: [] });
        });
    }
}

const NodeEditor = ({ onClose }) => {
  const canvasRef = useRef(null);
  const nodesRef = useRef([]);
  const nextIdRef = useRef(1);
  const animationRef = useRef(null);
  
  const params = useStore((state) => state.params);
  const setParam = useStore((state) => state.setParam);
  const audioData = useStore((state) => state.audioData);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let nodes = nodesRef.current;
    let draggingNode = null;
    let connectingSocket = null;
    let dragOffset = {x:0, y:0};
    let mousePos = {x:0, y:0};

    // Init default nodes if empty
    if (nodes.length === 0) {
        const addNode = (type, name, x, y) => {
            const node = new Node(nextIdRef.current++, type, name, x, y);
            nodes.push(node);
            return node;
        };
        
        const n1 = addNode('INPUT', 'Audio Low', 50, 100);
        const n2 = addNode('MATH', 'Multiply', 300, 150);
        const n3 = addNode('INPUT', 'Value', 50, 250); n3.params.val = 2.0;
        const n4 = addNode('OUTPUT', 'uDepthStrength', 600, 150);
        
        // Connect
        const connect = (outNode, outIdx, inNode, inIdx) => {
             inNode.inputs[inIdx].connectedTo = { nodeId: outNode.id, socketIdx: outIdx };
             outNode.outputs[outIdx].connections.push({ nodeId: inNode.id, socketIdx: inIdx });
        };
        
        connect(n1, 0, n2, 0);
        connect(n3, 0, n2, 1);
        connect(n2, 0, n4, 0);
    }

    const updateNodes = () => {
        // Simple update loop
        nodes.forEach(node => {
            if (node.type === 'INPUT') {
                if (node.name === 'Audio Low') node.value = audioData.low;
                else if (node.name === 'Audio Mid') node.value = audioData.mid;
                else if (node.name === 'Audio High') node.value = audioData.high;
                else if (node.name === 'Value') node.value = node.params.val || 0.5;
            } else if (node.type === 'MATH') {
                const getVal = (idx) => {
                    const inp = node.inputs[idx];
                    if (inp && inp.connectedTo) {
                        const src = nodes.find(n => n.id === inp.connectedTo.nodeId);
                        return src ? src.value : 0;
                    }
                    return 0;
                };
                const a = getVal(0);
                const b = getVal(1);
                if (node.name === 'Multiply') node.value = a * b;
                else if (node.name === 'Add') node.value = a + b;
            } else if (node.type === 'OUTPUT') {
                const getVal = (idx) => {
                    const inp = node.inputs[idx];
                    if (inp && inp.connectedTo) {
                        const src = nodes.find(n => n.id === inp.connectedTo.nodeId);
                        return src ? src.value : 0;
                    }
                    return 0;
                };
                const val = getVal(0);
                // Update global store
                if (params[node.name] !== undefined) {
                    // Avoid infinite loop or too many updates? 
                    // Direct mutation of store might be too heavy per frame.
                    // For now, we can just update the store directly if we throttle or use a ref for the store setter?
                    // Actually, let's just update the store. Zustand is fast.
                    // But calling setParam every frame might trigger re-renders.
                    // Better to have Visualizer read from a ref or direct subscription?
                    // For this demo, let's just update.
                    setParam(node.name, val);
                }
            }
        });
    };

    const draw = () => {
        updateNodes();

        ctx.fillStyle = 'rgba(15, 15, 20, 0.95)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Grid
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<canvas.width; i+=40) { ctx.moveTo(i,0); ctx.lineTo(i, canvas.height); }
        for(let i=0; i<canvas.height; i+=40) { ctx.moveTo(0,i); ctx.lineTo(canvas.width, i); }
        ctx.stroke();

        // Connections
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        nodes.forEach(node => {
           node.inputs.forEach(input => {
               if (input.connectedTo) {
                   const src = nodes.find(n => n.id === input.connectedTo.nodeId);
                   if (!src) return;
                   const outSocket = src.outputs[input.connectedTo.socketIdx];
                   
                   const x1 = src.x + outSocket.localPos.x;
                   const y1 = src.y + outSocket.localPos.y;
                   const x2 = node.x + input.localPos.x;
                   const y2 = node.y + input.localPos.y;
                   
                   ctx.beginPath();
                   ctx.moveTo(x1, y1);
                   ctx.bezierCurveTo(x1 + 50, y1, x2 - 50, y2, x2, y2);
                   ctx.stroke();
               }
           }); 
        });

        // Drag Line
        if (connectingSocket) {
            const n = connectingSocket.node;
            const socket = connectingSocket.isInput ? n.inputs[connectingSocket.index] : n.outputs[connectingSocket.index];
            const x1 = n.x + socket.localPos.x;
            const y1 = n.y + socket.localPos.y;
            
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(mousePos.x, mousePos.y);
            ctx.stroke();
        }

        // Nodes
        nodes.forEach(node => {
            ctx.fillStyle = '#333';
            ctx.fillRect(node.x, node.y, node.w, node.h);
            ctx.fillStyle = NODE_TYPES[node.type].color;
            ctx.fillRect(node.x, node.y, node.w, 20);
            ctx.fillStyle = '#fff';
            ctx.font = '12px monospace';
            ctx.fillText(node.name, node.x + 5, node.y + 14);
            if(node.type === 'INPUT') ctx.fillText(node.value.toFixed(2), node.x + 5, node.y + 40);
            
            ctx.fillStyle = '#666';
            node.inputs.forEach(inp => {
                ctx.beginPath(); ctx.arc(node.x + inp.localPos.x, node.y + inp.localPos.y, 5, 0, Math.PI*2); ctx.fill();
            });
            node.outputs.forEach(out => {
                ctx.beginPath(); ctx.arc(node.x + out.localPos.x, node.y + out.localPos.y, 5, 0, Math.PI*2); ctx.fill();
            });
        });

        animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();

    // Event Handlers
    const handleMouseDown = (e) => {
        const mx = e.clientX;
        const my = e.clientY;
        
        for (let i = nodes.length - 1; i >= 0; i--) {
            const n = nodes[i];
            
            // Inputs
            for(let j=0; j<n.inputs.length; j++) {
                 const sx = n.x + n.inputs[j].localPos.x;
                 const sy = n.y + n.inputs[j].localPos.y;
                 if (Math.hypot(mx-sx, my-sy) < 10) {
                     connectingSocket = { node: n, index: j, isInput: true };
                     return;
                 }
            }
            // Outputs
            for(let j=0; j<n.outputs.length; j++) {
                 const sx = n.x + n.outputs[j].localPos.x;
                 const sy = n.y + n.outputs[j].localPos.y;
                 if (Math.hypot(mx-sx, my-sy) < 10) {
                     connectingSocket = { node: n, index: j, isInput: false };
                     return;
                 }
            }
            // Body
            if (mx > n.x && mx < n.x + n.w && my > n.y && my < n.y + n.h) {
                draggingNode = n;
                dragOffset.x = mx - n.x;
                dragOffset.y = my - n.y;
                return;
            }
        }
    };

    const handleMouseMove = (e) => {
        mousePos = {x: e.clientX, y: e.clientY};
        if (draggingNode) {
            draggingNode.x = e.clientX - dragOffset.x;
            draggingNode.y = e.clientY - dragOffset.y;
        }
    };

    const handleMouseUp = (e) => {
        if (connectingSocket) {
            const mx = e.clientX; 
            const my = e.clientY;
            for (let i = nodes.length - 1; i >= 0; i--) {
                const n = nodes[i];
                if (n === connectingSocket.node) continue;
                
                const targetIsInput = !connectingSocket.isInput;
                const sockets = targetIsInput ? n.inputs : n.outputs;
                
                for(let j=0; j<sockets.length; j++) {
                    const sx = n.x + sockets[j].localPos.x;
                    const sy = n.y + sockets[j].localPos.y;
                     if (Math.hypot(mx-sx, my-sy) < 15) {
                         if (targetIsInput) {
                             n.inputs[j].connectedTo = { nodeId: connectingSocket.node.id, socketIdx: connectingSocket.index };
                             connectingSocket.node.outputs[connectingSocket.index].connections.push({ nodeId: n.id, socketIdx: j });
                         } else {
                             connectingSocket.node.inputs[connectingSocket.index].connectedTo = { nodeId: n.id, socketIdx: j };
                             n.outputs[j].connections.push({ nodeId: connectingSocket.node.id, socketIdx: connectingSocket.index });
                         }
                     }
                }
            }
        }
        draggingNode = null;
        connectingSocket = null;
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    return () => {
        cancelAnimationFrame(animationRef.current);
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [audioData, params, setParam]); // Dependencies might cause re-init of canvas listeners if not careful. 
  // Ideally, we should use refs for mutable state inside the effect loop.

  return (
    <div className="fixed top-0 left-0 w-full h-full z-50">
        <div className="absolute top-5 left-5 flex gap-2 bg-[#222] p-2.5 rounded border border-[#444] z-10">
            <button className="btn w-auto px-4 mb-0" onClick={onClose}>Close Editor</button>
            <span className="text-[#666] text-xs self-center">Right Click to Add Nodes (Not Implemented in React Demo yet)</span>
        </div>
        <canvas ref={canvasRef} className="w-full h-full cursor-crosshair"></canvas>
    </div>
  );
};

export default NodeEditor;
