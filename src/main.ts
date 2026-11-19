const desktop = document.getElementById("desktop")!;
let desktop_registry: WindowFrame[] = [];

const taskbar = document.getElementById("opened-tabs")!;
let taskbar_registry: MinimizedWindowFrame[] = [];

let focused_window: WindowFrame | null = null;

let preset_window_data: { [id: string]: PresetWindowData } = {};

let album_list: object[] = [];

let currently_selected_album: number = 0;

function unfocus_window() {
  focused_window = null;

  for (let min_window of taskbar_registry) {
    update_minimized(min_window);
  }
}

function focus_window(window: WindowFrame) {
  window.bring_to_front();

  window.show();

  focused_window = window;

  for (let min_window of taskbar_registry) {
    update_minimized(min_window);
  }
}

function update_minimized(min: MinimizedWindowFrame) {
  min.object.classList.remove("active");

  if (min.window_frame == focused_window) {
    min.object.classList.add("active");
  }
}

function trim_text(text: string, limit: number): string {
  if (text.length > limit) {
    return text.substring(0, limit - 4) + "...";
  } else {
    return text;
  }
}

class MinimizedWindowFrame {
  title: string;
  icon: string;
  window_frame: WindowFrame;
  object: HTMLDivElement;

  constructor(frame: WindowFrame) {
    this.window_frame = frame;
    this.title = trim_text(frame.title, 50);
    this.icon = frame.icon;
    this.object = document.createElement("div");

    this.create_object();

    taskbar.appendChild(this.object);
    taskbar_registry.push(this);
  }

  create_object() {
    this.object = document.createElement("div");
    this.object.className = "open-tab";
    this.object.innerHTML = "<img src=\"assets/" + this.icon + "\"> " + this.title;

    this.object.onmousedown = this.interact.bind(this);
  }

  interact() {
    if (this.window_frame == focused_window) {
      console.log(this.window_frame.shown);
      if (this.window_frame.shown) {
        this.window_frame.hide();
      } else {
        focus_window(this.window_frame);
      }
    } else {
      focus_window(this.window_frame);
    }
  }

  remove() {
    taskbar.removeChild(this.object);
    delete taskbar_registry[taskbar_registry.indexOf(this)];
  }
}

type FunctionCallback = (frame: WindowFrame) => void;
type ContentCallback = (content: string) => string;

class WindowFrame {
  title: string;
  icon: string;
  width: number;
  height: number;
  content_url: string;
  callback: FunctionCallback;
  content_callback: ContentCallback;

  object: HTMLDivElement;
  title_bar: HTMLDivElement;
  body: HTMLDivElement;
  minimized: MinimizedWindowFrame;
  held: boolean;
  shown: boolean;
  prev: [number, number];
  curr: [number, number];

  constructor(title: string, width: number, height: number, content_url: string, icon: string, callback: FunctionCallback, content_callback: ContentCallback) {
    this.title = title;
    this.width = width;
    this.height = height;
    this.content_url = content_url;
    this.callback = callback;
    this.content_callback = content_callback;
    this.icon = icon;
    this.object = document.createElement("div");
    this.title_bar = document.createElement("div");
    this.body = document.createElement("div");
    this.minimized = this.create_minimized();
    this.held = false;
    this.shown = true;
    this.prev = [0, 0];
    this.curr = [0, 0];
    focused_window = this;

    this.create_object();
    this.setup_move();

    desktop.appendChild(this.object);
    desktop_registry.push(this);

    // this.object.onload = e => {
    //   console.log("calling callback");
    //   this.callback(this);
    // }

    // requestAnimationFrame(() => {
    //   this.callback(this);
    // })

    const observer = new MutationObserver((mutationsList, observer) => {
      mutationsList.forEach(mutation => {
        if (mutation.type == "childList") {
          console.log("wacky");
          this.callback(this);
          observer.disconnect();
        }
      });
    });

    observer.observe(this.body, { childList: true, subtree: true });

    focus_window(this);
  }

  create_object() {
    this.object = document.createElement("div");
    this.object.className = "window";
    this.object.style.width = this.width + "px";
    this.object.style.height = this.height + "px";

    this.create_titlebar();
    this.create_body();

    this.object.style.left = (document.body.offsetWidth / 2 - this.width / 2) + "px";
    this.object.style.top = (document.body.offsetHeight / 2 - this.height / 2) + "px";
  }

  setup_move() {
    this.held = false;

    this.prev = [0, 0];
    this.curr = [0, 0];

    this.title_bar.onmousedown = this.begin_drag.bind(this);
    this.object.onmousedown = () => { focus_window(this); };
  }

  begin_drag(event: MouseEvent) {
    for (let elem of Array.from(document.getElementsByTagName("button"))) {
      if (elem.matches(":hover")) {
        return;
      }
    }
    console.log("begin drag");
    event.preventDefault();

    this.prev = [0, 0];
    this.curr = [event.clientX, event.clientY];

    document.onmousemove = this.handle_drag.bind(this);
    document.onmouseup = this.stop_drag.bind(this);
  }

  handle_drag(event: MouseEvent) {
    console.log("handle drag");
    event.preventDefault();

    if (event.clientX > -1 && event.clientY > -1) {
      this.prev[0] = (this.curr[0] - event.clientX);
      this.prev[1] = (this.curr[1] - event.clientY);
      this.curr = [event.clientX, event.clientY];

      console.log(this.prev);

      console.log(this.object.offsetLeft);
      let b = this.object.offsetLeft - this.prev[0];
      b = b > -1 ? b : 0;

      let maxX = desktop.offsetWidth - this.object.offsetWidth;
      b = b < maxX ? b : maxX;

      let g = this.object.offsetTop - this.prev[1];
      g = g > -1 ? g : 0;

      let maxY = desktop.offsetHeight - this.object.offsetHeight;
      g = g < maxY ? g : maxY;

      console.log(b, g);

      this.object.style.left = b + "px";
      this.object.style.top = g + "px";
    }
  }

  stop_drag(event: MouseEvent) {
    console.log("stop drag");
    document.onmousemove = null;
    document.onmouseup = null;
  }

  create_titlebar() {
    this.title_bar = document.createElement("div");
    this.title_bar.className = "title-bar";
    this.object.appendChild(this.title_bar);

    let title_bar_text = document.createElement("div");
    title_bar_text.className = "title-bar-text";
    title_bar_text.innerText = this.title;
    this.title_bar.appendChild(title_bar_text);

    let title_bar_controls = document.createElement("div");
    title_bar_controls.className = "title-bar-controls";
    this.title_bar.appendChild(title_bar_controls);

    let min_button = document.createElement("button");
    min_button.ariaLabel = "Minimize";
    title_bar_controls.appendChild(min_button);

    let clo_button = document.createElement("button");
    clo_button.ariaLabel = "Close";
    title_bar_controls.appendChild(clo_button);

    min_button.onclick = this.hide.bind(this);
    clo_button.onclick = this.remove.bind(this);
  }

  get_html(file: string): HTMLElement {
    let cont = document.createElement("article");
    cont.role = "tabpanel";
    cont.className = "content";

    fetch("windows/" + file + ".html")
      .then(response => {
        if (!response.ok) {
          throw new Error("network die while trying to get window conten,,,t");
        }
        return response.text();
      })
      .then(data => {
        cont.innerHTML = this.content_callback(data);
      })

    return cont;
  }

  create_body() {
    let contents = document.createElement("div");
    contents.className = "window-body";

    let interior = this.get_html(this.content_url);
    contents.appendChild(interior);

    interior.style.width = (this.width - 16) + "px";
    interior.style.maxWidth = (this.width - 16) + "px";
    interior.style.height = (this.height - 34) + "px";
    interior.style.maxHeight = (this.height - 34) + "px";

    this.object.appendChild(contents);
  }

  bring_to_front() {
    this.object.style.zIndex = "100";

    for (let win of desktop_registry) {
      let zi = Number(win.object.style.zIndex) - 1;

      if (zi < 1) {
        zi = 1;
      }

      win.object.style.zIndex = zi.toString();
    }
  }

  create_minimized(): MinimizedWindowFrame {
    let min = new MinimizedWindowFrame(this);

    return min;
  }

  hide() {
    console.log("hide");
    this.object.style.display = "none";

    this.shown = false;

    unfocus_window();
  }

  show() {
    console.log("show");
    this.object.style.display = "block";

    this.shown = true;
  }

  remove() {
    desktop.removeChild(this.object);
    delete desktop_registry[desktop_registry.indexOf(this)];

    this.minimized.remove();
  }
}

class PresetWindowData {
  id: string;
  title: string;
  width: number;
  height: number;
  content_url: string;
  icon: string;
  callback: FunctionCallback;
  content_callback: ContentCallback;

  constructor(id: string, title: string, width: number, height: number, content_url: string, icon: string = "file.png", callback: FunctionCallback | null = null, content_callback: ContentCallback | null = null) {
    this.id = id;
    this.title = title;
    this.width = width;
    this.height = height;
    this.content_url = content_url;
    this.icon = icon;
    this.callback = callback ? callback : frame => { };
    this.content_callback = content_callback ? content_callback : content => content;

    preset_window_data[this.id] = this;
  }

  spawn(): WindowFrame {
    return new WindowFrame(this.title, this.width, this.height, this.content_url, this.icon, this.callback, this.content_callback);
  }
}

function window_exists(id: string): boolean {
  let t_name = preset_window_data[id].title;

  let r = false;

  desktop_registry.forEach(elem => {
    if (elem.title == t_name) {
      focus_window(elem);
      r = true;
    }
  })
  return r;
}

function get_window_from_id(id: string): WindowFrame | null {
  let ret: WindowFrame | null = null;
  let t_name = preset_window_data[id].content_url;
  console.log(t_name);
  desktop_registry.forEach(elem => {
    console.log(elem.content_url);
    if (elem.content_url == t_name) {
      console.log("they ma");
      ret = elem;
    }
  })
  return ret;
}

function spawn_window(id: string) {
  console.log(id);
  if (id in preset_window_data) {
    if (!window_exists(id)) {
      preset_window_data[id].spawn();
    }
  } else {
    throw new Error("windor no existie");
  }
}

const start_minimized = (frame: WindowFrame) => {
  frame.hide();
}

const get_random = <T>(list: T[]): T => {
  return list[Math.floor(Math.random() * list.length)];
}

// examples
new PresetWindowData(
  "intro",
  "Intro",
  500, 400,
  "intro",
  "computer.png"
);

requestAnimationFrame(() => {
  spawn_window("intro");
});
