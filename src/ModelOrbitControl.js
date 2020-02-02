function debounce(timer, fn, delay) {
	clearTimeout(timer.id);
	timer.id = setTimeout(() => {
		fn();
	}, delay);
}

// Todo: Pan control
class ModelOrbitControl {
	constructor(
		model,
		renderer,
		{
			width = window.innerWidth,
			height = window.innerHeight,
			enableAutoRotate = false,
			enableXRotation = true,
			enableYRotation = true,
			autoRotateDeg = (0.1 * Math.PI) / 180,
			zoomInLimit = 0.01, // Tips: Effective by import model init scale
			zoomOutLimit = 1,
			zoomSpeed = 1.02,
			mouseRotateSpeed = 0.04,
			mouseMoveSpeed = 0.01,
			rotateXUpLimit = Math.PI/2,
			rotateXDownLimit = -Math.PI/2,
			easeOffset = 0.2,
			zoomCallBack = null
		}
	) {
		this.model = model;
		this.renderer = renderer;
		this.width = width;
		this.height = height;
		this.mouseRotateSpeed = mouseRotateSpeed;
		this.enableAutoRotate = enableAutoRotate;
		this.enableXRotation = enableXRotation;
		this.enableYRotation = enableYRotation;
		this.autoRotateDeg = autoRotateDeg;
		this.zoomInLimit = zoomInLimit;
		this.zoomOutLimit = zoomOutLimit;
		this.zoomSpeed = zoomSpeed;
		this.mouseMoveSpeed = mouseMoveSpeed;
		this.rotateXUpLimit = rotateXUpLimit;
		this.rotateXDownLimit = rotateXDownLimit;
		this.easeOffset = easeOffset;

		this.halfWidth = this.width / 2;
		this.halfHeight = this.height / 2;
		this.targetRotationX = 0;
		this.targetRotationOnMouseDownX = 0;
		this.targetRotationY = 0;
		this.targetRotationOnMouseDownY = 0;
		this.mouseX = 0;
		this.mouseXOnMouseDown = 0;
		this.mouseY = 0;
		this.mouseYOnMouseDown = 0;
		this.mouseStatus = 0; // 0=>mouseDown 1=>mouseUp

		this.finalRotateY = 0;
		this.finalRotateX = 0;

		this.eventChangeTime = 300; // ms
		this.eventChangeTimer = {};

		this.modelPositionOnMouseDownX = 0;
		this.modelPositionOnMouseDownX = 0;
		this.targetPositionX = 0;
		this.targetPositionY = 0;
		this.finalPositionY = 0;
		this.finalPositionX = 0;

		// CallBack
		this.zoomCallBack = zoomCallBack;

		this.initEvent();
	}

	initEvent() {
		if ('ontouchmove' in window) {
			this.onTouchStart = this.onTouchStart.bind(this);
			this.onTouchMove = this.onTouchMove.bind(this);
			this.onMouseUp = this.onMouseUp.bind(this);
			this.renderer.domElement.addEventListener('touchstart', this.onTouchStart, false);
			this.renderer.domElement.addEventListener('touchmove', this.onTouchMove, false);
			this.renderer.domElement.addEventListener('touchend', this.onMouseUp, false);
			this.renderer.domElement.addEventListener('touchcancel', this.onMouseUp, false);
		} else {
			this.onContextMenu = this.onContextMenu.bind(this);
			this.onMouseWheel = this.onMouseWheel.bind(this);
			this.onMouseDown = this.onMouseDown.bind(this);
			this.onMouseMove = this.onMouseMove.bind(this);
			this.onMouseUp = this.onMouseUp.bind(this);
			this.renderer.domElement.addEventListener('contextmenu', this.onContextMenu, false);
			this.renderer.domElement.addEventListener('wheel', this.onMouseWheel, false);
			this.renderer.domElement.addEventListener('mousedown', this.onMouseDown, false);
			this.renderer.domElement.addEventListener('mousemove', this.onMouseMove, false);
			this.renderer.domElement.addEventListener('mouseup', this.onMouseUp, false);
			this.renderer.domElement.addEventListener('mouseout', this.onMouseUp, false);
			this.renderer.domElement.addEventListener('mouseleave', this.onMouseUp, false);
		}
	}

	onContextMenu(e) {
		e.preventDefault();
	}

	onMouseWheel(event) {
		if (!this.model) return;
		let model = this.model;
		let zoomSpeed = this.zoomSpeed;
		let zoomInLimit = this.zoomInLimit;
		let zoomOutLimit = this.zoomOutLimit;
		if (event.deltaY > 0) {
			model.scale.divideScalar(zoomSpeed);
			if (model.scale.x < zoomInLimit) {
				model.scale.setScalar(zoomInLimit);
			} else {
				typeof this.zoomCallBack === 'function' && this.zoomCallBack('divide', zoomSpeed);
			}
		} else if (event.deltaY < 0) {
			model.scale.multiplyScalar(zoomSpeed);
			if (model.scale.x > zoomOutLimit) {
				model.scale.setScalar(zoomOutLimit);
			} else {
				typeof this.zoomCallBack === 'function' && this.zoomCallBack('multiply', zoomSpeed);
			}
		}
	}

	onMouseDown(event) {
		event.preventDefault();
		this.mouseStatus = 1;
		this.mouseXOnMouseDownOrign = event.clientX;
		this.mouseYOnMouseDownOrign = event.clientY;

		this.mouseXOnMouseDown = event.clientX - this.halfWidth;
		this.targetRotationOnMouseDownX = this.targetRotationX;
		this.mouseYOnMouseDown = event.clientY - this.halfHeight;
		this.targetRotationOnMouseDownY = this.targetRotationY;
	}

	onMouseMove(event) {
		if (this.mouseStatus != 1) return;
		this.mouseX = event.clientX - this.halfWidth;
		this.mouseY = event.clientY - this.halfHeight;
		this.targetRotationY =
			this.targetRotationOnMouseDownY + (this.mouseY - this.mouseYOnMouseDown) * this.mouseMoveSpeed;
		this.targetRotationX =
			this.targetRotationOnMouseDownX + (this.mouseX - this.mouseXOnMouseDown) * this.mouseMoveSpeed;
	}

	onMouseUp() {
		this.mouseStatus = 0;
	}

	dispose() {
		this.resetRotate();
		// Remove all listener
		if ('ontouchmove' in window) {
			this.renderer.domElement.removeEventListener('touchstart', this.onTouchStart, false);
			this.renderer.domElement.removeEventListener('touchmove', this.onTouchMove, false);
			this.renderer.domElement.removeEventListener('touchend', this.onMouseUp, false);
			this.renderer.domElement.removeEventListener('touchcancel', this.onMouseUp, false);
		} else {
			this.renderer.domElement.removeEventListener('contextmenu', this.onContextMenu, false);
			this.renderer.domElement.removeEventListener('wheel', this.onMouseWheel, false);
			this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown, false);
			this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove, false);
			this.renderer.domElement.removeEventListener('mouseup', this.onMouseUp, false);
			this.renderer.domElement.removeEventListener('mouseout', this.onMouseUp, false);
			this.renderer.domElement.removeEventListener('mouseleave', this.onMouseUp, false);
		}
	}

	resetRotate(model) {
		let group = model || this.model;
		if (!group) return;
		this.targetRotationX = group.rotation.y; // Tips: TargetX - model.y => finRotateY
		this.targetRotationY = group.rotation.x;
		this.finalRotateY = 0;
		this.finalRotateX = 0;
	}

	recoverRotate(rotation) {
		if (!rotation) return;
		this.targetRotationX = rotation.y;
		this.targetRotationY = rotation.x;
		this.finalRotateY = 0;
		this.finalRotateX = 0;
	}

	onTouchStart(event) {
		event.preventDefault();
		this.mouseStatus = 1;
		if (event.touches.length == 2) {
			let dx = event.touches[0].pageX - event.touches[1].pageX;
			let dy = event.touches[0].pageY - event.touches[1].pageY;
			this.touchStartDistance = Math.sqrt(dx * dx + dy * dy);
		} else if (event.touches.length == 1) {
			this.mouseXOnMouseDown = event.touches[0].pageX - this.halfWidth;
			this.targetRotationOnMouseDownX = this.targetRotationX;
			this.mouseYOnMouseDown = event.touches[0].pageY - this.halfHeight;
			this.targetRotationOnMouseDownY = this.targetRotationY;
		}
	}

	onTouchMoveDolly(event) {
		if (!this.model) return;
		let model = this.model;
		let zoomSpeed = this.zoomSpeed;
		let zoomInLimit = this.zoomInLimit;
		let zoomOutLimit = this.zoomOutLimit;

		let dx = event.touches[0].pageX - event.touches[1].pageX;
		let dy = event.touches[0].pageY - event.touches[1].pageY;
		let distance = Math.sqrt(dx * dx + dy * dy);
		let dolly = distance - this.touchStartDistance;
		if (dolly < 0) {
			model.scale.divideScalar(zoomSpeed);
			if (model.scale.x < zoomInLimit) {
				model.scale.setScalar(zoomInLimit);
			} else {
				typeof this.zoomCallBack === 'function' && this.zoomCallBack('divide', zoomSpeed);
			}
		} else if (dolly > 0) {
			model.scale.multiplyScalar(zoomSpeed);
			if (model.scale.x > zoomOutLimit) {
				model.scale.setScalar(zoomOutLimit);
			} else {
				typeof this.zoomCallBack === 'function' && this.zoomCallBack('multiply', zoomSpeed);
			}
		}
		this.lockSingleTouch = true;
		debounce(
			this.eventChangeTimer,
			() => {
				this.lockSingleTouch = false;
			},
			this.eventChangeTime
		);
	}

	onTouchMove() {
		this.mouseStatus = 1;
		event.preventDefault();
		if (event.touches.length == 2) {
			this.onTouchMoveDolly(event);
		} else if (event.touches.length == 1) {
			if (this.lockSingleTouch) return;
			this.mouseX = event.touches[0].pageX - this.halfWidth;
			this.targetRotationX =
				this.targetRotationOnMouseDownX + (this.mouseX - this.mouseXOnMouseDown) * this.mouseMoveSpeed;
			this.mouseY = event.touches[0].pageY - this.halfHeight;
			this.targetRotationY =
				this.targetRotationOnMouseDownY + (this.mouseY - this.mouseYOnMouseDown) * this.mouseMoveSpeed;
			this.deltaTarget = this.targetRotationY;
		}
	}

	resize(width, height) {
		this.width = width;
		this.height = height;
		this.halfWidth = this.width / 2;
		this.halfHeight = this.height / 2;
	}

	update() {
		let group = this.model;
		// Rotation
		if (!this.mouseStatus && this.enableAutoRotate) {
			// Auto Scroll
			group.rotation.y += this.autoRotateDeg;
			this.targetRotationX = group.rotation.y;
			this.targetRotationY = group.rotation.x;
			this.finalRotateY = 0;
			this.finalRotateX = 0;
		} else {
			// Drag Scroll
			// Tips: TargetX - model.y => finRotateY
			this.finalRotateY = this.targetRotationX - group.rotation.y;
			this.finalRotateX = this.targetRotationY - group.rotation.x;
			// Horizontal Rotation
			if (Math.abs(this.finalRotateY) > this.easeOffset && this.enableYRotation) {
				group.rotation.y += this.finalRotateY * this.mouseRotateSpeed;
			}
			// Vertical Rotation
			if (
				Math.abs(this.finalRotateX) > this.easeOffset &&
				group.rotation.x <= this.rotateXUpLimit &&
				group.rotation.x >= this.rotateXDownLimit &&
				this.enableXRotation
			) {
				group.rotation.x += this.finalRotateX * this.mouseRotateSpeed;
				// Boundary Limit X Axis
				if (group.rotation.x > this.rotateXUpLimit) {
					group.rotation.x = this.rotateXUpLimit;
				} else if (group.rotation.x < this.rotateXDownLimit) {
					group.rotation.x = this.rotateXDownLimit;
				}
			}
		}
	}
}

export { ModelOrbitControl };