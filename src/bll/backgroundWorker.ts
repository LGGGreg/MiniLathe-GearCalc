export interface IToPlainObject {
    toPlainObject(): any;
}

export default class BackgroundWorker {
    
    public reportProgress(p: number | undefined){
        postMessage({key: 'progress', value: p});
    }
  
    public initWorker(workFn: (param: any) => Promise<IToPlainObject | IToPlainObject[] | undefined>) {
        self.addEventListener("message", async (event) => {
            const params = event.data.params;
            const id = event.data.id;
            postMessage({ key: "working", id, value: true });
            try {

                const result = await workFn(params);
                let data = undefined;
                if (Array.isArray(result))
                    data = result.map(i => i.toPlainObject());
                else if(result != undefined)
                    data = result.toPlainObject()
                postMessage({key: 'result', id, value: data});
            } catch (e) {
                postMessage({key: 'error', id, value: e});
            }
            postMessage({ key: "working", id, value: false });
        });
    }
}

export class WorkerClient<T> {
    private static _workers: any = {};
    private static _requests: any = {};

    private worker!: Worker;

    public createWorker(module: string, fromPlainObjectFn: (o:any) => T = (o) => o as T, progressHandler: (b: boolean, p: number | undefined) => void = ()=>{}) {
        if (WorkerClient._workers[module] == undefined) {
            const w = new Worker(module, {type: "module"});

            const _this = this;

            w.onerror = (ev: ErrorEvent): any => {
                console.error("[[WorkerClient]] Worker error: ", ev);

                const msg = "Worker creation failed!\n\nIf you're using Firefox or other firefox based browsers, you should switch to Chrome, Edge, Vivaldi, "+
                "or any other Chromium based browser.\n\n"+
                "Until Mozilla decides to properly support module typed workers, you're out of luck.";
                alert(msg);

                _this.worker.terminate();
                const blob = new Blob([`self.addEventListener("message", () => postMessage({}))`], {type: "application/javascript"});
                const ew = new Worker(URL.createObjectURL(blob));
                ew.onmessage = () => alert(msg);
                WorkerClient._workers[module] = ew;
                _this.worker = ew;
            }

            w.onmessage = (ev: MessageEvent) => {
                if (ev.data.key == "working") {
                progressHandler(ev.data.value, undefined);
                } else if (ev.data.key == "progress") {
                progressHandler(true, ev.data.value);
                } else if (ev.data.key == "result"){
                    _this.resolve(ev.data.id, fromPlainObjectFn(ev.data.value));
                } else if (ev.data.key == "error"){
                    _this.reject(ev.data.id, ev.data.value);
                }
            }
            WorkerClient._workers[module] = w;

            console.log(`[[WorkerClient]] Client created: ${module}`);
        }
        this.worker = WorkerClient._workers[module];
    }

    private clearPromiseFns(id: string){
        WorkerClient._requests[id] = undefined;
        
        console.log(`[[WorkerClient]] Promise functions cleared ${id}`);
    }

    private resolve(id: string, result: T){
        const o = WorkerClient._requests[id];
        if (o == undefined) {
            console.error("resolveFn null!", WorkerClient._requests, id);
        } else {
            o.resolve(result);
            console.log(`[[WorkerClient]] Promise resolved: ${id}`);
        }
        this.clearPromiseFns(id);
    }

    private reject(id: string, reason: any, strict: boolean = true) {
        const o = WorkerClient._requests[id];
        if (o == undefined)
            if(strict) 
                console.error("rejectFn null!", WorkerClient._requests, id);
            else 
                return;
        else{
            o.reject(reason);
            console.log(`[[WorkerClient]] Promise rejected: ${id}`, reason);
        }
        this.clearPromiseFns(id);
    }

    public runWorker(params: any, timeoutMs: number = 5000): Promise<T> {
        const _this = this;
        let id: string;
        do {
            id = `req-id-${Math.round(Math.random()*100000)}`;
        } while (id in WorkerClient._requests);

        setTimeout(()=> {
            _this.reject(id, "Timeout", false);
        }, timeoutMs);
        const p = new Promise<T>((resolve, reject) => {

            WorkerClient._requests[id] = {resolve, reject}
            console.log(`[[WorkerClient]] New promise: ${id}`, _this.worker);

            _this.worker.postMessage({id, params});
        });
        
        return p;
    }
}