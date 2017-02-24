this.HorrorGame = {
	canvas: null,
	
	init: function() {
		var self = HorrorGame;
		
		// create gl
		self.Renderer.createGL();
		self.canvas = self.Renderer.gl.canvas;
		
		// init renderer
		self.Renderer.init();
		
		// start first frame
		requestAnimationFrame(self.frame);
	},
	
	frame: function() {
		var self = HorrorGame;
		
		// draw
		self.Renderer.draw();
		
		// request next frame
		requestAnimationFrame(self.frame);
	},
};

HorrorGame.Renderer = {
	gl: null,
	gli: null,
	resolution: {x: 640, y: 480},
	
	shaderScene: null,
	
	tempViewMatrix: new Mat4(),
	tempProjectionMatrix: new Mat4(),
	tempMVPMatrix: new Mat4(),
	
	createGL: function() {
		// create context
		var self = HorrorGame.Renderer;
		self.gl = NebGL.createGLForId("game-canvas", {alpha: false, depth: true});
	},
	
	init: function() {
		var self = HorrorGame.Renderer;
		
		// load shaders
		self.shaderScene = NebGL.createProgramFromScripts(self.gl, "shader-scene-vert", "shader-scene-frag");
		self.shaderScene.uMatMVP = self.gl.getUniformLocation(self.shaderScene, "uMatMVP");
		
		// create dynamic draw context
		self.gli = WebGLDynamicDraw.createContext(self.gl);
	},
	
	draw: function() {
		var self = HorrorGame.Renderer;
		var gl = self.gl;
		
		// use shader
		gl.useProgram(self.shaderScene);
		
		{// update matrices
			// update projection matrix
			self.tempProjectionMatrix.setPerspective(weml.toRadians(80 * (self.resolution.x/self.resolution.y)), self.resolution.x/self.resolution.y, 0.1, 100.0);
			
			// update view matrix
			self.tempViewMatrix.setTranslationXYZ(0, 0, -Math.abs(Math.sin(performance.now() / 1000.0) * 5.0));
			
			// calc mvp matrix
			self.tempProjectionMatrix.mul(self.tempViewMatrix, self.tempMVPMatrix);
			
			gl.uniformMatrix4fv(self.shaderScene.uMatMVP, false, self.tempMVPMatrix);
		}
		
		// clear
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		// DEBUG: test draw
		var gli = self.gli;
		gli.enableVertexAttrib(0, true);
		gli.vertexAttrib(0, 3, gl.FLOAT, false);
		
		gli.begin(gl.TRIANGLES);
			gli.addVertex3(0, 0, -1, 0);
			gli.addVertex3(0, 2, -1, 0);
			gli.addVertex3(0, 2, -1, 2);
		gli.end();
	},
};

$(function() {
	HorrorGame.init();
});