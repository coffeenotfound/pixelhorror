
this.HorrorGame = {
	canvas: null,
	
	keyinput: null,
	
	init: function() {
		var self = HorrorGame;
		
		// create gl
		self.Renderer.createGL();
		self.canvas = self.Renderer.gl.canvas;
		
		// DEBUG: pointer lock
		$("#game-canvas").click(function () {
			var canvas = $("#game-canvas")[0];
			canvas.requestPointerLock();
		});
		$("#game-canvas")[0].onmousemove = function(e) {
			HorrorGame.Game.playerController.mouseMove(e.movementX, e.movementY);
		};
		
		// create keyinput
		self.keyinput = new KeyInput({target: document.getElementById("game-canvas")});
		
		// init renderer
		self.Renderer.init();
		
		// load base resources
		self.Loader.loadDefaultFonts();
		
		// start game
		self.Game.start();
		
		// start first frame
		requestAnimationFrame(self.frame);
	},
	
	frame: function() {
		var self = HorrorGame;
		
		self.Game.frame();
		
		// request next frame
		requestAnimationFrame(self.frame);
	},
};


/** static Game */
HorrorGame.Game = {
	playerController: null,
	
	start: function() {
		var self = HorrorGame.Game;
		
		// create playercontroller
		var playerController = new HorrorGame.PlayerController();
		self.playerController = playerController;
		
		// create camera
		var playerCam = new HorrorGame.Camera();
		playerCam.pos[1] = 1.5;
		
		self.playerController.playerCamera = playerCam;
		HorrorGame.Renderer.activeCamera = playerCam;
	},
	
	frame: function() {
		var self = HorrorGame.Game;
		
		// tick playercontroller
		self.playerController.tick();
		
		// draw
		HorrorGame.Renderer.draw();
	}
};


/** class PlayerController */
HorrorGame.PlayerController = function() {
	
};
HorrorGame.PlayerController.prototype = {
	playerCamera: null,
	playerEntity: null,
	
	_headbobAmount: 0.0,
	_headbobCycle: 0.0,
	_headbobWalkCycleFac: 2.2,
	_headbobDistance: 0.075,
	
	walkSpeedWalk: 0.02,
	walkSpeedRun: 0.04,
	lookSensitivity: 0.002,
	
	_onGround: false,
	
	tick: function() {
		// player move
		var keyinput = HorrorGame.keyinput;
		var walked = false;
		
		var tempWalkVec = new Vec3();
		if(keyinput.isKeyDown(65)) {
			tempWalkVec[0] += 1.0;
			walked = true;
		}
		if(keyinput.isKeyDown(68)) {
			tempWalkVec[0] -= 1.0;
			walked = true;
		}
		if(keyinput.isKeyDown(87)) {
			tempWalkVec[2] -= 1.0;
			walked = true;
		}
		if(keyinput.isKeyDown(83)) {
			tempWalkVec[2] += 1.0;
			walked = true;
		}
		
		var tempDoRun = false;
		var walkedHeadbobIncr = 0.0;
		if(walked && tempWalkVec.magnitude() > 0.0) {
			if(keyinput.isKeyDown(16)) {
				tempDoRun = true;
			}
			
			var tempCurrentWalkSpeed = (tempDoRun ? this.walkSpeedRun : this.walkSpeedWalk);
			
			// calc move vec
			tempWalkVec.normalize().mulScalar(tempCurrentWalkSpeed);
			
			var tempOldX = tempWalkVec[0];
			var tempOldZ = tempWalkVec[2];
			var tempSin = Math.sin(this.playerCamera.lookrot[0]);
			var tempCos = Math.cos(this.playerCamera.lookrot[0]);
			tempWalkVec[0] = tempOldX * tempCos + tempOldZ * -tempSin;
			tempWalkVec[2] = tempOldX * tempSin + tempOldZ * tempCos;
			
			// actually move player
			this.playerCamera.pos.add(tempWalkVec);
			
			// calc headbob cycle increment
			walkedHeadbobIncr = tempCurrentWalkSpeed * this._headbobWalkCycleFac;
		}
		
		// calc headbob
		if(walked) {
			this._headbobAmount += 0.1;
			if(this._headbobAmount > 1.0) this._headbobAmount = 1.0;
			
			this._headbobCycle += walkedHeadbobIncr;
		}
		else {
			this._headbobAmount -= 0.1;
			if(this._headbobAmount < 0.0) {
				this._headbobAmount = 0.0;
				this._headbobCycle = 0.0;
			}
		}
	},
	
	mouseMove: function(movementX, movementY) {
		this.playerCamera.rotateLook(-movementX * this.lookSensitivity, movementY * this.lookSensitivity);
	},
	
	applyHeadbob: function(mat) {
		var horbob = Math.sin(this._headbobCycle) * this._headbobDistance * this._headbobAmount * 0.5;
		var vertbob = Math.abs(Math.sin(this._headbobCycle)) * this._headbobDistance * this._headbobAmount;
		mat.applyTranslationLocalXYZ(horbob, 0.0, 0.0).applyTranslationXYZ(0.0, vertbob, 0.0);
	},
};


/** static Renderer */
HorrorGame.Renderer = {
	gl: null,
	gli: null,
	resolution: {x: 240, y: 180},
	resscale: 5,
	
	activeCamera: null,
	
	fboMain: null,
	fboMainTexColor: null,
	fboMainTexDepth: null,
	fboUI: null,
	fboUITexColor: null,
	fboUITexDepth: null,
	
	screenquadVAO: null,
	shaderScene: null,
	
	tempViewMatrix: new Mat4(),
	tempProjectionMatrix: new Mat4(),
	tempMVPMatrix: new Mat4(),
	
	TESTtexture: null,
	
	createGL: function() {
		// create context
		var self = HorrorGame.Renderer;
		self.gl = NebGL.createGLForId("game-canvas", {width: self.resolution.x*self.resscale, height: self.resolution.y*self.resscale, alpha: false, depth: false, antialias: false});
	},
	
	init: function() {
		var self = HorrorGame.Renderer;
		var gl = self.gl;
		
		{ // create main fbo
			self.fboMain = gl.createFramebuffer();
			gl.bindFramebuffer(gl.FRAMEBUFFER, self.fboMain);
			
			self.fboMainTexColor = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, self.fboMainTexColor);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, self.resolution.x, self.resolution.y, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			
			self.fboMainTexDepth = gl.createRenderbuffer();
			gl.bindRenderbuffer(gl.RENDERBUFFER, self.fboMainTexDepth);
			gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, self.resolution.x, self.resolution.y);
			
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, self.fboMainTexColor, 0);
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, self.fboMainTexDepth);
		}
		{ //create ui fbo
			self.fboUI = gl.createFramebuffer();
			gl.bindFramebuffer(gl.FRAMEBUFFER, self.fboUI);
			
			self.fboUITexColor = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, self.fboUITexColor);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, self.resolution.x, self.resolution.y, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			
			self.fboUITexDepth = gl.createRenderbuffer();
			gl.bindRenderbuffer(gl.RENDERBUFFER, self.fboUITexDepth);
			gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, self.resolution.x, self.resolution.y);
			
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, self.fboUITexColor, 0);
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, self.fboUITexDepth);
		}
		
		// load shaders
		self.shaderScene = NebGL.createProgramFromScripts(self.gl, "shader-scene-vert", "shader-scene-frag");
		gl.bindAttribLocation(self.shaderScene, 0, "inVertex");
		gl.bindAttribLocation(self.shaderScene, 1, "inNormal");
		gl.bindAttribLocation(self.shaderScene, 2, "inTexCoord");
		gl.linkProgram(self.shaderScene);
		self.shaderScene.uMatMVP = self.gl.getUniformLocation(self.shaderScene, "uMatMVP");
		self.shaderScene.uMatMV = self.gl.getUniformLocation(self.shaderScene, "uMatMV");
		
		self.shaderPost = NebGL.createProgramFromScripts(self.gl, "shader-post-vert", "shader-post-frag");
		gl.bindAttribLocation(self.shaderPost, 0, "inVertex");
		gl.linkProgram(self.shaderPost);
		self.shaderPost.uResolution = self.gl.getUniformLocation(self.shaderPost, "uResolution");
		
		self.shaderUI = NebGL.createProgramFromScripts(self.gl, "shader-ui-vert", "shader-ui-frag");
		gl.bindAttribLocation(self.shaderUI, 0, "inVertex");
		gl.bindAttribLocation(self.shaderUI, 1, "inTexCoord");
		gl.linkProgram(self.shaderUI);
		self.shaderUI.uMatP = self.gl.getUniformLocation(self.shaderUI, "uMatP");
		self.shaderUI.uResolution = self.gl.getUniformLocation(self.shaderUI, "uResolution");
		self.shaderUI.uBlit = self.gl.getUniformLocation(self.shaderUI, "uBlit");
		
		// create dynamic draw context
		self.gli = WebGLDynamicDraw.createContext(self.gl);
		
		// create test texture
		var testTexData = new Uint8Array(16 * 16 * 4);
		for(var i = 0; i < 16*16; i++) {
			testTexData[i*4+0] = weml.rand(0, 127);
			testTexData[i*4+1] = weml.rand(127, 255);
			testTexData[i*4+2] = weml.rand(0, 127);
			testTexData[i*4+3] = 255;
		}
		
		self.TESTtexture = self.gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, self.TESTtexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		//gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 16, 16, 0, gl.RGBA, gl.UNSIGNED_BYTE, testTexData);
		
		var iimage = new Image();
		iimage.onload = function() {
			gl.bindTexture(gl.TEXTURE_2D, self.TESTtexture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, iimage);
		}
		iimage.src = "res/grass.png";
		
		// create screenquad
		var screenquadData = new Float32Array([0,0, 0,1, 1,0,  1,0, 0,1, 1,1]);
		var screenquadVBO = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, screenquadVBO);
		gl.bufferData(gl.ARRAY_BUFFER, screenquadData, gl.STATIC_DRAW);
		
		self.screenquadVAO = gl.createVertexArray();
		gl.bindVertexArray(self.screenquadVAO);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		gl.bindVertexArray(null);
	},
	
	draw: function() {
		var self = HorrorGame.Renderer;
		var gl = self.gl;
		
		// use shader
		gl.useProgram(self.shaderScene);
		
		{// update matrices
			// update view and projection matrix
			self.activeCamera.calcPerspectiveMatrix(self.tempProjectionMatrix);
			self.activeCamera.calcViewMatrix(self.tempViewMatrix);
			
			// apply headbob
			if(HorrorGame.Game.playerController) {
				HorrorGame.Game.playerController.applyHeadbob(self.tempViewMatrix);
			}
			
			// calc mvp matrix
			self.tempProjectionMatrix.mul(self.tempViewMatrix, self.tempMVPMatrix);
			
			gl.uniformMatrix4fv(self.shaderScene.uMatMV, false, self.tempViewMatrix);
			gl.uniformMatrix4fv(self.shaderScene.uMatMVP, false, self.tempMVPMatrix);
		}
		
		// bind framebuffer
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, self.fboMain);
		gl.viewport(0, 0, self.resolution.x, self.resolution.y);
		
		// clear
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		// DEBUG: test draw
		var gli = self.gli;
		gli.enableVertexAttrib(0, true);
		gli.vertexAttrib(0, 3, gl.FLOAT, false);
		
		gli.enableVertexAttrib(2, true);
		gli.vertexAttrib(2, 3, gl.FLOAT, false);
		
		gl.bindTexture(gl.TEXTURE_2D, self.TESTtexture);
		
		gli.begin(gl.TRIANGLES);
			gli.addVertex3(2, 0, 0, 0);
			gli.addVertex3(0, -8, 0, -8);
			
			gli.addVertex3(2, 0, 1, 0);
			gli.addVertex3(0, -8, 0, 8);
			
			gli.addVertex3(2, 1, 0, 0);
			gli.addVertex3(0, 8, 0, -8);
			
			
			gli.addVertex3(2, 1, 0, 0);
			gli.addVertex3(0, 8, 0, -8);
			
			gli.addVertex3(2, 0, 1, 0);
			gli.addVertex3(0, -8, 0, 8);
			
			gli.addVertex3(2, 1, 1, 0);
			gli.addVertex3(0, 8, 0, 8);
		gli.end();
		
		// DEBUG: draw coordinate system
		//gli.enableVertexAttrib(2, false);
		
		/*
		gli.begin(gl.LINES);
			gli.addVertex3(0, 0, 1, 0);
			gli.addVertex3(0, 1, 1, 0);
			
			gli.addVertex3(0, 0, 1, 0);
			gli.addVertex3(0, 0, 3, 0);
			
			gli.addVertex3(0, 0, 1, 0);
			gli.addVertex3(0, 0, 1, 3);
		gli.end();
		*/
		
		{ // blit to back buffer; postprocess
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			
			// bind shader
			gl.useProgram(self.shaderPost);
			
			// update uniforms
			gl.uniform3f(self.shaderPost.uResolution, self.resolution.x, self.resolution.y, self.resscale);
			
			// bind fbo color buffer
			gl.bindTexture(gl.TEXTURE_2D, self.fboMainTexColor);
			
			// draw screenquad
			gl.bindVertexArray(self.screenquadVAO);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
			gl.bindVertexArray(null)
		}
		
		// draw ui
		self.drawUI();
	},
	
	drawScene: function() {
		
	},
	
	drawUI: function() {
		var self = HorrorGame.Renderer;
		var gl = self.gl;
		
		// bind shader
		gl.useProgram(self.shaderUI);
		
		{ // update uniforms
			gl.uniform1i(self.shaderUI.uBlit, 0);
			
			self.tempProjectionMatrix.setOrtho(0, self.resolution.x, self.resolution.y, 0, -1, 1);
			gl.uniformMatrix4fv(self.shaderUI.uMatP, false, self.tempProjectionMatrix);
		}
		
		// bind fbo
		gl.bindFramebuffer(gl.FRAMEBUFFER, self.fboUI);
		
		// enable blend
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		
		{ // blit to back buffer
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
			
			// update uniforms
			gl.uniform1i(self.shaderUI.uBlit, 1);
			
			// bind fbo color buffer
			gl.bindTexture(gl.TEXTURE_2D, self.fboUITexColor);
			
			// draw screenquad
			gl.bindVertexArray(self.screenquadVAO);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
			gl.bindVertexArray(null)
		}
	},
};


/** static FontRenderer */
HorrorGame.FontRenderer = {
	defaultFontBig: null,
	
	colorPallete: [0x000000, 0x808080, 0xC0C0C0, 0xFFFFFF, 0xFF0000, 0x800000, 0xFFFF00, 0x080800, 0x00FF00, 0x008000, 0x00FFFF, 0x008080, 0x0000FF, 0x000080, 0xFF00FF, 0x800080],
	shadowPallete: [3, 0, 1, 2, 5, 1, 7, 1, 9, 1, 11, 1, 13, 1, 15, 1],
	
	currentColor: 3,
	currentStyle: 0,
	
	clipRectX: 0,
	clipRectY: 0,
	clipRectWidth: 0,
	clipRectHeight: 0,
	
	drawText: function(text, x, y, font) {
		var xx = x;
		var yy = y;
		
		for(var i = 0; i < text.length; i++) {
			var c = font.translateGlyph(text.charCodeAt(i));
			
			// get char width
			var glyphWidth = font.getGlyphWidth(c);
			
			// check clip
			
		}
	},
	
	drawGlpyh: function(glyph, x, y) {
		
	},
	
	/** Sets the clip rect which the text should be confined to */
	setClipRect: function(x, y, width, height) {
		
	},
	
	/** Resets various state to begin drawing of a new string */
	reset: function() {
		
	},
};


/** class Font */
HorrorGame.Font = function() {
	
};
HorrorGame.Font.prototype = {
	glyphWidths: null,
	bitmap: null,
	
	translateGlyph: function(glpyh) {
		return (glyph < 32 || glyph > 127 ? 127 : glpyh);
	},
};


/** static Loader */
HorrorGame.Loader = {
	resPath: "res/",
	
	loadJSON: async function(file) {
		var self = HorrorGame.Loader;
		var xhr = new XMLHttpRequest();
		xhr.open("GET", self.resPath + file, /*true*/false);
		//xhr.responseType = "text";
		
		// js should just fucking die already
		
		/*
		var finished = false;
		xhr.onload = function() {
			finished = true;
			console.log("LOAD");
		};
		xhr.onerror = function() {
			finished = true;
			console.log("ERROR");
		};
		
		console.log(xhr.readyState);
		
		// send xhr
		xhr.send();
		
		// wait to finish
		console.log(xhr.readyState);
		
		console.log(xhr.readyState);
		
		//var jsonresult = JSON.parse(xhr.responseText);
		//return jsonresult;
		*/
		
		// send xhr
		try {
			xhr.send();
		}
		catch(e) {
			console.log(e);
		}
		
		// parse json
		var jsonresult = JSON.parse(xhr.response);
		return jsonresult;
	},
	
	loadImage: function(file) {
		var self = HorrorGame.Loader;
		var img = new Image();
		img.src = self.resPath + file;
		return img;
	},
	
	loadFont: function(name) {
		var self = HorrorGame.Loader;
		
		// create font
		var font = new HorrorGame.Font();
		
		// load font json file
		var json = self.loadJSON(name + ".font");
		font.glyphWidths = json.glyphWidths;
		
		// load font bitmap
		font.bitmap = self.loadImage(name + ".png");
		
		return font;
	},
	
	loadDefaultFonts: function() {
		var self = HorrorGame.Loader;
		HorrorGame.FontRenderer.defaultFontBig = self.loadFont("font_big");
	},
};


/** class Camera */
HorrorGame.Camera = function() {
	
};
HorrorGame.Camera.prototype = {
	pos: new Vec3(),
	lookrot: new Vec3(),
	
	rotateLook: function(rotx, roty) {
		this.lookrot[0] += rotx;
		this.lookrot[1] += roty;
		
		// clamp y
		if(this.lookrot[1] > Math.PI/2) {
			this.lookrot[1] = Math.PI/2;
		}
		if(this.lookrot[1] < -Math.PI/2) {
			this.lookrot[1] = -Math.PI/2;
		}
	},
	
	calcViewMatrix: function(mat) {
		mat.identity().applyRotationX(this.lookrot[1]).applyRotationY(this.lookrot[0]).applyTranslationXYZ(-this.pos[0], -this.pos[1], -this.pos[2]);
		//mat.applyTranslationXYZ(0, 0, -Math.abs(Math.sin(performance.now() / 1000.0) * 5.0));
		return mat;
	},
	calcPerspectiveMatrix: function(mat) {
		var res = HorrorGame.Renderer.resolution;
		return mat.setPerspective(weml.toRadians(65), res.x/res.y, 0.1, 100.0);
	},
};


$(function() {
	HorrorGame.init();
});