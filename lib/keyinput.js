var KeyInput = function(initconfig) {
	initconfig = initconfig || {};
	
	// properties
	this.config = {
		target: initconfig.target || window,
		releaseOnBlur: initconfig.releaseOnBlur || true,
		requestFocus: initconfig.requestFocus || true,
	};
	this.keystatesPress = new Array(256);
	this.keystatesRelease = new Array(256);
	this.lastpoll = 0;
	this.thispoll = 0;
	
	this.currentTextHandler = {
		handler: null,
		passive: null,
		
		exists: function() {
			return this.handler != null;
		},
		isCapturing: function() {
			return this.exists() && (this.passive == false);
		},
		fireEvent: function(event) {
			this.handler(event);
		},
		/*
		fireTextEvent: function(text) {
			var te = KeyInput.TextInputEvent.newTextEvent(text);
			this.fireEvent(te);
		},
		fireCommandEvent: function(command, data) {
			var te = KeyInput.TextInputEvent.newCommandEvent(command, data);
			this.fireEvent(te);
		},
		*/
	};
	
	// prime arrays
	var now = this.perfnow();
	for(var i = 0; i < this.keystatesPress.length; i++) {
		this.keystatesPress[i] = now;
		this.keystatesRelease[i] = now;
	}
	
	var self = this;
	
	// public methods
	this.isKeyDown = function(key, duration) {
		var duration = duration || 0;
		return this.keystatesPress[key] > this.keystatesRelease[key] + duration;
	};
	this.isKeyUp = function(key, duration) {
		return !this.isKeyDown(key, duration); // ensure it always returns the opposite of isKeyDown
	};
	this.poll = function() {
		// set new poll timestamp
		this.lastpoll = this.thispoll;
		this.thispoll = this.perfnow();
	};
	this.hasFocus = function() {
		return document.hasFocus();
	};
	
	this.beginTextInput = function(handler, passive) {
		if(!handler) return;
		
		// send endinput command to previous handler
		if(this.currentTextHandler.exists()) {
			var te = KeyInput.TextInputEvent.newCommandEvent(null, self.perfnow(), KeyInput.TextInputEvent.COMMAND_ENDINPUT, null);
			this.currentTextHandler.fireEvent(te);
		}
		
		// set current handler
		this.currentTextHandler.handler = handler;
		this.currentTextHandler.passive = passive || false;
		
		// release keys
		if(!this.currentTextHandler.passive) {
			var now = self.perfnow();
			for(var i = 0; i < self.keystatesRelease.length; i++) {
				// only release pressed keys
				if(self.keystatesPress[i] > self.keystatesRelease[i]) {
					self.keystatesRelease[i] = now;
				}
			}
		}
		
		// send begininput command
		var te = KeyInput.TextInputEvent.newCommandEvent(null, self.perfnow(), KeyInput.TextInputEvent.COMMAND_BEGININPUT, null);
		this.currentTextHandler.fireEvent(te);
	};
	this.endTextInput = function() {
		if(!this.currentTextHandler.handler) return;
		
		// send endinput event
		var te = KeyInput.TextInputEvent.newCommandEvent(null, self.perfnow(), KeyInput.TextInputEvent.COMMAND_ENDINPUT, null);
		this.currentTextHandler.fireEvent(te);
		
		// clear currenthandler
		this.currentTextHandler.handler = null;
	};
	/** returns the current textinput handler or null if there is none */
	this.getTextInputHandler = function() {
		return this.currentTextHandler.handler;
	};
	
	// private code
	
	// on keydown
	this.config.target.addEventListener('keydown', function(e) {
		var dokeyinput = !self.currentTextHandler.isCapturing();
		
		if(dokeyinput) {
			var key = e.keyCode;
			
			/*
			// prevent default on 'keydown' causes 'input' events not to fire
			// TODO: figure out way to prevent tabbing while still typing a tab
			//		-> prevent tab and fire input event manually?
			
			// allow f keys
			if(key < 112 || key > 123) e.preventDefault();
			*/
			
			// ignore repeat (if implemented)
			if(e.repeat == true) return;
			
			// set
			self.keystatesPress[key] = self.perfnow();
		}
	}, true);
	
	// on keyup
	this.config.target.addEventListener('keyup', function(e) {		
		var dokeyinput = !self.currentTextHandler.isCapturing();
		
		if(dokeyinput) {
			var key = e.keyCode;
			
			/*
			// allow f keys
			if(key < 112 || key > 123) e.preventDefault();
			*/
			
			// set
			self.keystatesRelease[key] = self.perfnow();
		}
	}, true);
	
	// on focus lose
	window.onblur = function(e) {
		// release all keys
		if(self.config.releaseOnBlur) {
			var now = self.perfnow();
			for(var i = 0; i < self.keystatesRelease.length; i++) {
				// only release pressed keys
				if(self.keystatesPress[i] > self.keystatesRelease[i]) {
					self.keystatesRelease[i] = now;
				}
			}
		}
	};
	
	// create hidden input element
	this.hiddenInputElement = document.createElement("input");
	this.hiddenInputElement.setAttribute("type", "text");
	this.hiddenInputElement.setAttribute("id", "keyinputjs-textinput");
	this.hiddenInputElement.style.cssText = "position: absolute; opacity: 0; width: 0; height: 0; margin: 0; padding: 0; border: 0; outline: 0;"; // display:none and visibility cause input events not to be fired (probably for security reasons)
	this.config.target.appendChild(this.hiddenInputElement);
	//document.body.appendChild(this.hiddenInputElement);
	
	this.hiddenInputElement.value = "";
	
	// listen for text input
	this.hiddenInputElement.addEventListener('input', function(e) {
		var text = self.hiddenInputElement.value;
		self.hiddenInputElement.value = "";
		
		// fire event
		if(self.currentTextHandler.exists()) {
			var te = KeyInput.TextInputEvent.newTextEvent(e, self.perfnow(), text);
			self.currentTextHandler.fireEvent(te);
		}
	});
	
	// listen for command input
	document.addEventListener('keydown', function(e) {
		// ensure focus on hidden input element on keypress
		self.hiddenInputElement.focus();
		
		var _fillOutControlKeys = function(te, e) {
			te.shiftKey = e.shiftKey || false;
			te.ctrlKey = e.ctrlKey || false;
			te.altKey = e.altKey || false;
			te.metaKey = e.metaKey || false;
		};
		
		// ignore if no textinputhandler present
		if(self.currentTextHandler.exists()) {
			if(!e.altKey) {
				var key = e.keyCode;
				
				// !alt && ctrl
				if(e.ctrlKey) {
					switch(key) {
						
					}
					
					// paste if PasteEvent not supported
					if(!supportsOnPaste && key == 86) {
						var te = KeyInput.TextInputEvent.newCommandEvent(e, self.perfnow(), KeyInput.TextInputEvent.COMMAND_PASTE, null); // TODO: put paste data
						self.currentTextHandler.fireEvent(te);
					}
				}
				
				// !alt
				switch(key) {
					// backspace
					case 8:
						var te = KeyInput.TextInputEvent.newCommandEvent(e, self.perfnow(), KeyInput.TextInputEvent.COMMAND_DELETE, {direction: -1});
						_fillOutControlKeys(te, e);
						self.currentTextHandler.fireEvent(te);
						break;
					// enter
					case 13:
						var te = KeyInput.TextInputEvent.newCommandEvent(e, self.perfnow(), KeyInput.TextInputEvent.COMMAND_ENTER, null);
						_fillOutControlKeys(te, e);
						self.currentTextHandler.fireEvent(te);
						break;
					
					// up
					case 38:
						var te = KeyInput.TextInputEvent.newCommandEvent(e, self.perfnow(), KeyInput.TextInputEvent.COMMAND_CURSOR, { moveX: 0, moveY: -1 });
						_fillOutControlKeys(te, e);
						self.currentTextHandler.fireEvent(te); break;
					// down
					case 40:
						var te = KeyInput.TextInputEvent.newCommandEvent(e, self.perfnow(), KeyInput.TextInputEvent.COMMAND_CURSOR, { moveX: 0, moveY: 1 });
						_fillOutControlKeys(te, e);
						self.currentTextHandler.fireEvent(te); break;
					// left
					case 37:
						var te = KeyInput.TextInputEvent.newCommandEvent(e, self.perfnow(), KeyInput.TextInputEvent.COMMAND_CURSOR, { moveX: -1, moveY: 0 });
						_fillOutControlKeys(te, e);
						self.currentTextHandler.fireEvent(te); break;
					// right
					case 39:
						var te = KeyInput.TextInputEvent.newCommandEvent(e, self.perfnow(), KeyInput.TextInputEvent.COMMAND_CURSOR, { moveX: 1, moveY: 0 });
						_fillOutControlKeys(te, e);
						self.currentTextHandler.fireEvent(te); break;
				}
			}
		}
	});
	
	// handle clipboard command
	const supportsOnPaste = ("onpaste" in window);
	if(supportsOnPaste) {
		document.addEventListener("paste", function(e) {
			// fire event
			if(self.currentTextHandler.exists()) {
				var te = KeyInput.TextInputEvent.newCommandEvent(e, self.perfnow(), KeyInput.TextInputEvent.COMMAND_PASTE, null); // TODO: actually put the paste data
				self.currentTextHandler.fireEvent(te);
			}
		});
	}
};

// class TextInputEvent
KeyInput.TextInputEvent = function(cause, when, type, text, command, data) {
	this.cause = cause;
	this.when = when;
	
	this.type = type;
	if(text) this.text = text;
	if(command) this.command = command;
	if(data) this.data = data;
};
KeyInput.prototype = {
	
};
KeyInput.TextInputEvent.newTextEvent = function(cause, when, text) {
	return new KeyInput.TextInputEvent(cause, when, KeyInput.TextInputEvent.TYPE_TEXT, text, null, null);
};
KeyInput.TextInputEvent.newCommandEvent = function(cause, when, command, data) {
	return new KeyInput.TextInputEvent(cause, when, KeyInput.TextInputEvent.TYPE_COMMAND, null, command, data || null);
};
KeyInput.TextInputEvent.prototype = {
	cause: null,
	when: null, // timestamp
	
	shiftKey: null,
	ctrlKey: null,
	altKey: null,
	metaKey: null,
	
	type: null, // type of event, either TYPE_TEXT or TYPE_COMMAND
	text: null, // input text if type==TYPE_TEXT
	command: null, // input command if type==TYPE_COMMAND
	data: null, // optional command payload data
};
KeyInput.TextInputEvent.TYPE_TEXT = 'text';
KeyInput.TextInputEvent.TYPE_COMMAND = 'command';
KeyInput.TextInputEvent.COMMAND_BEGININPUT = 'begininput';
KeyInput.TextInputEvent.COMMAND_ENDINPUT = 'endinput';
KeyInput.TextInputEvent.COMMAND_DELETE = 'delete';
KeyInput.TextInputEvent.COMMAND_ENTER = 'enter';
KeyInput.TextInputEvent.COMMAND_PASTE = 'paste';
KeyInput.TextInputEvent.COMMAND_CURSOR = 'cursor';

var TextBoxControl = function(config) {
	//this.config = config || {};
	self = this;
};
TextBoxControl.prototype = {
	self,
	maxLines: 4,
	
	text: [""], // text split by lines
	cursor: {x:0, y:0},
	selection: {start:-1, end:-1},
	
	changeListeners: [],
	_notifyChange: function(e) {
		e.control = this;
		for(var i = 0; i < self.changeListeners.length; i++) {
			if(self.changeListeners[i]) {
				self.changeListeners[i](e);
			}
		}
	},
	
	// text input handler
	texteventhandler: function(te) {
		if(te.type == KeyInput.TextInputEvent.TYPE_TEXT) {
			self.type(te.text);
		}
		else {
			switch(te.command) {
				// move cursor
				case KeyInput.TextInputEvent.COMMAND_CURSOR:
					self.moveCursor(te.data.moveX, te.data.moveY);
					break;
				// newline
				case KeyInput.TextInputEvent.COMMAND_ENTER:
					self.typeNewLine();
					break;
			}
		}
	},
	
	// "internal functions"
	type: function(text) {
		// type at cursor
		var line = self.text[self.cursor.y] || "";
		var newLine = line.substring(0, self.cursor.x) + text + line.substring(self.cursor.x, line.length);
		self.text[self.cursor.y] = newLine;
		
		// move cursor
		self.moveCursor(text.length, 0);
		
		// fire change event
		self._notifyChange({ text: true });
	},
	typeNewLine: function() {
		self.moveCursor(0, 1);
	},
	erase: function() {
		/*
		var line = self.text[self.cursor.y] || "";
		
		// collapse line
		if(self.cursor.x - 1 < 0) {
			self.cursor.y
		}
		
		// fire change event
		self._notifyChange({ text: true });
		*/
	},
	moveCursor: function(x, y) {
		// add
		self.cursor.x += x;
		self.cursor.y += y;
		
		// clamp y
		if(self.cursor.y < 0) self.cursor.y = 0;
		if(self.cursor.y >= self.maxLines) self.cursor.y = self.maxLines - 1;
		
		// ensure line exists
		if(!self.text[self.cursor.y]) {
			self.text[self.cursor.y] = "";
		}
		
		// preclamp x
		if(y < 0) {
			self.cursor.x = Math.min(self.cursor.x, self.text[self.cursor.y].length);
		}
		
		// clamp x
		if(self.cursor.x < 0) {
			if(self.cursor.y > 0) {
				self.cursor.y--;
				self.cursor.x = (self.text[self.cursor.y] || "").length;
			}
			else {
				self.cursor.x = 0;
			}
		}
		if(self.cursor.x > (self.text[self.cursor.y] || "").length) {
			if(self.cursor.y < self.text.length - 1) {
				self.cursor.y++;
				self.cursor.x = 0;
			}
			else {
				self.cursor.x = (self.text[self.cursor.y] || "").length;
			}
		}
		
		// fire change event
		self._notifyChange({ cursor: true });
	},
	
	// callbacks
	addChangeListener: function(f) {
		self.changeListeners.push(f);
	},
};

// performance.now fallbacks
KeyInput.prototype.perfnow = (function() {
	if(performance) {
		if(performance.now) return function() { return performance.now(); };
		else if(performance.mozNow) return function() { return performance.mozNow(); };
		else if(performance.msNow) return function() { return performance.msNow(); };
		else if(performance.oNow) return function() { return performance.oNow(); };
		else if(performance.webkitNow) return function() { return performance.webkitNow(); };
	}
	// worst case fallback
	return function() { return new Date().getTime(); };
})();