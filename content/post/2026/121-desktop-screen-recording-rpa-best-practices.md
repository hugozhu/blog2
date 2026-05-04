---
title: "通过桌面录屏实现自动化 RPA 的最佳实践"
subtitle: "从屏幕录制到 AI 驱动的智能自动化流程构建"
date: 2026-02-09
tags: ["RPA", "AI", "automation", "computer-vision", "multimodal", "screen-recording"]
ingested: 2026-05-04
sha256: 36d296aa5e85b1d9bf75210a8c81fd9aa7d83392e5b6cc2c0947c71216c5cbbf
---
传统的 RPA（Robotic Process Automation）工具通常需要手动编写脚本或使用可视化编排工具，学习成本高且维护困难。随着多模态 AI 的发展，一种新的范式正在兴起：通过录制用户的桌面操作，让 AI 自动理解并复现这些操作。这种方式大大降低了自动化的门槛，让业务人员也能快速构建自动化流程。

<!--more-->

## 为什么选择录屏驱动的 RPA？

### 传统 RPA 的痛点

1. **高技术门槛**：需要编写代码或学习复杂的可视化工具
2. **维护成本高**：UI 变化时脚本经常失效
3. **场景覆盖有限**：难以处理动态内容和异常情况
4. **缺乏智能**：无法理解操作的语义，只是机械重复

### 录屏 + AI 的优势

- **零代码上手**：只需录制一次操作，AI 自动学习
- **语义理解**：AI 理解操作意图，而非死记硬背坐标
- **智能适应**：界面变化时能自动调整
- **异常处理**：可以识别并处理意外情况

## 整体架构设计

```
┌──────────────────────────────────────────────────────────────────┐
│                   Screen Recording RPA System                     │
├──────────────────────────────────────────────────────────────────┤
│  Layer 1: 录制层                                                   │
│  ├── 屏幕录制模块 (视频 + 音频)                                      │
│  ├── 鼠标/键盘事件捕获                                              │
│  └── 时间戳同步                                                    │
├──────────────────────────────────────────────────────────────────┤
│  Layer 2: 理解层                                                   │
│  ├── 视频帧提取与关键帧检测                                          │
│  ├── 多模态 LLM 分析 (GPT-4V / Claude Vision / Gemini)             │
│  └── 操作序列抽象                                                  │
├──────────────────────────────────────────────────────────────────┤
│  Layer 3: 执行层                                                   │
│  ├── 元素定位引擎 (视觉 + 语义)                                      │
│  ├── 动作执行器 (pyautogui / playwright)                           │
│  └── 验证与重试机制                                                 │
├──────────────────────────────────────────────────────────────────┤
│  Layer 4: 编排层                                                   │
│  ├── 流程定义与管理                                                 │
│  ├── 调度与触发器                                                  │
│  └── 监控与日志                                                    │
└──────────────────────────────────────────────────────────────────┘
```

## Step 1: 构建录制模块

### 1.1 屏幕录制

我们需要同时录制屏幕画面和用户的输入事件。

```python
import cv2
import numpy as np
import pyautogui
from pynput import mouse, keyboard
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from datetime import datetime
import threading
import json
import time

@dataclass
class InputEvent:
    """表示一个输入事件"""
    timestamp: float          # 相对于录制开始的时间（秒）
    event_type: str          # "click", "scroll", "key_press", "key_release", "move"
    position: Optional[Tuple[int, int]] = None  # 鼠标位置
    button: Optional[str] = None                 # 鼠标按钮
    key: Optional[str] = None                    # 按键
    data: dict = field(default_factory=dict)     # 额外数据

@dataclass
class RecordingSession:
    """录制会话"""
    video_path: str
    events: List[InputEvent]
    start_time: float
    end_time: float
    screen_size: Tuple[int, int]
    fps: int = 10

class ScreenRecorder:
    """
    屏幕录制器

    同时捕获：
    1. 屏幕视频
    2. 鼠标点击、移动、滚动
    3. 键盘输入
    """

    def __init__(self, output_dir: str = "./recordings", fps: int = 10):
        self.output_dir = output_dir
        self.fps = fps
        self.is_recording = False
        self.events: List[InputEvent] = []
        self.start_time: float = 0
        self.screen_size = pyautogui.size()

        # 录制线程
        self._video_thread: Optional[threading.Thread] = None
        self._video_writer: Optional[cv2.VideoWriter] = None

        # 输入监听器
        self._mouse_listener: Optional[mouse.Listener] = None
        self._keyboard_listener: Optional[keyboard.Listener] = None

    def _on_mouse_click(self, x: int, y: int, button, pressed: bool):
        """鼠标点击回调"""
        if not self.is_recording:
            return

        event = InputEvent(
            timestamp=time.time() - self.start_time,
            event_type="click" if pressed else "release",
            position=(x, y),
            button=str(button),
            data={"pressed": pressed}
        )
        self.events.append(event)

    def _on_mouse_scroll(self, x: int, y: int, dx: int, dy: int):
        """鼠标滚动回调"""
        if not self.is_recording:
            return

        event = InputEvent(
            timestamp=time.time() - self.start_time,
            event_type="scroll",
            position=(x, y),
            data={"dx": dx, "dy": dy}
        )
        self.events.append(event)

    def _on_key_press(self, key):
        """键盘按下回调"""
        if not self.is_recording:
            return

        try:
            key_str = key.char if hasattr(key, 'char') else str(key)
        except AttributeError:
            key_str = str(key)

        event = InputEvent(
            timestamp=time.time() - self.start_time,
            event_type="key_press",
            key=key_str
        )
        self.events.append(event)

    def _record_video(self, output_path: str):
        """视频录制线程"""
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        self._video_writer = cv2.VideoWriter(
            output_path,
            fourcc,
            self.fps,
            self.screen_size
        )

        interval = 1.0 / self.fps

        while self.is_recording:
            frame_start = time.time()

            # 截取屏幕
            screenshot = pyautogui.screenshot()
            frame = np.array(screenshot)
            frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

            # 在帧上绘制鼠标位置（用于调试）
            mouse_pos = pyautogui.position()
            cv2.circle(frame, mouse_pos, 10, (0, 0, 255), -1)

            self._video_writer.write(frame)

            # 控制帧率
            elapsed = time.time() - frame_start
            if elapsed < interval:
                time.sleep(interval - elapsed)

        self._video_writer.release()

    def start_recording(self, session_name: str = None) -> str:
        """
        开始录制

        Args:
            session_name: 会话名称，用于生成文件名

        Returns:
            录制文件路径
        """
        if self.is_recording:
            raise RuntimeError("Already recording")

        import os
        os.makedirs(self.output_dir, exist_ok=True)

        if session_name is None:
            session_name = datetime.now().strftime("%Y%m%d_%H%M%S")

        video_path = f"{self.output_dir}/{session_name}.mp4"

        self.events = []
        self.start_time = time.time()
        self.is_recording = True

        # 启动视频录制线程
        self._video_thread = threading.Thread(
            target=self._record_video,
            args=(video_path,)
        )
        self._video_thread.start()

        # 启动输入监听
        self._mouse_listener = mouse.Listener(
            on_click=self._on_mouse_click,
            on_scroll=self._on_mouse_scroll
        )
        self._keyboard_listener = keyboard.Listener(
            on_press=self._on_key_press
        )
        self._mouse_listener.start()
        self._keyboard_listener.start()

        print(f"Recording started: {video_path}")
        return video_path

    def stop_recording(self) -> RecordingSession:
        """
        停止录制

        Returns:
            RecordingSession 对象
        """
        if not self.is_recording:
            raise RuntimeError("Not recording")

        self.is_recording = False
        end_time = time.time()

        # 停止监听器
        if self._mouse_listener:
            self._mouse_listener.stop()
        if self._keyboard_listener:
            self._keyboard_listener.stop()

        # 等待视频线程结束
        if self._video_thread:
            self._video_thread.join()

        # 获取视频路径
        video_path = self._video_writer.getfilename() if self._video_writer else ""

        session = RecordingSession(
            video_path=video_path,
            events=self.events.copy(),
            start_time=self.start_time,
            end_time=end_time,
            screen_size=self.screen_size,
            fps=self.fps
        )

        # 保存事件数据
        events_path = video_path.replace('.mp4', '_events.json')
        self._save_events(events_path)

        print(f"Recording stopped. Duration: {end_time - self.start_time:.1f}s")
        print(f"Captured {len(self.events)} input events")

        return session

    def _save_events(self, path: str):
        """保存事件到 JSON 文件"""
        events_data = [
            {
                "timestamp": e.timestamp,
                "event_type": e.event_type,
                "position": e.position,
                "button": e.button,
                "key": e.key,
                "data": e.data
            }
            for e in self.events
        ]

        with open(path, 'w') as f:
            json.dump(events_data, f, indent=2)

# generated by hugo's coding agent
```

### 1.2 关键帧提取

录制完成后，我们需要从视频中提取关键帧，用于后续的 AI 分析。

```python
import cv2
import numpy as np
from typing import List, Tuple
from dataclasses import dataclass

@dataclass
class KeyFrame:
    """关键帧"""
    frame_index: int
    timestamp: float
    image: np.ndarray
    associated_events: List[InputEvent]
    change_score: float  # 与前一帧的变化程度

class KeyFrameExtractor:
    """
    关键帧提取器

    策略：
    1. 基于画面变化检测
    2. 基于输入事件（点击、按键）
    3. 固定间隔采样
    """

    def __init__(self,
                 change_threshold: float = 0.1,
                 min_interval: float = 0.5,
                 event_window: float = 0.2):
        """
        Args:
            change_threshold: 画面变化阈值（0-1）
            min_interval: 关键帧最小间隔（秒）
            event_window: 事件关联时间窗口（秒）
        """
        self.change_threshold = change_threshold
        self.min_interval = min_interval
        self.event_window = event_window

    def extract(self,
                video_path: str,
                events: List[InputEvent]) -> List[KeyFrame]:
        """
        从视频中提取关键帧

        Args:
            video_path: 视频文件路径
            events: 输入事件列表

        Returns:
            关键帧列表
        """
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)

        keyframes = []
        prev_frame = None
        prev_keyframe_time = -float('inf')
        frame_index = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            timestamp = frame_index / fps

            # 计算与前一帧的变化
            change_score = 0.0
            if prev_frame is not None:
                change_score = self._compute_change(prev_frame, frame)

            # 判断是否为关键帧
            is_keyframe = False

            # 条件1：画面变化超过阈值
            if change_score > self.change_threshold:
                is_keyframe = True

            # 条件2：有关联的点击事件
            associated = self._find_associated_events(timestamp, events)
            click_events = [e for e in associated if e.event_type == "click"]
            if click_events:
                is_keyframe = True

            # 条件3：满足最小间隔
            if is_keyframe and (timestamp - prev_keyframe_time) >= self.min_interval:
                keyframe = KeyFrame(
                    frame_index=frame_index,
                    timestamp=timestamp,
                    image=frame.copy(),
                    associated_events=associated,
                    change_score=change_score
                )
                keyframes.append(keyframe)
                prev_keyframe_time = timestamp

            prev_frame = frame
            frame_index += 1

        cap.release()

        print(f"Extracted {len(keyframes)} keyframes from {frame_index} frames")
        return keyframes

    def _compute_change(self, frame1: np.ndarray, frame2: np.ndarray) -> float:
        """计算两帧之间的变化程度"""
        # 转换为灰度图
        gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)

        # 计算结构相似性
        diff = cv2.absdiff(gray1, gray2)
        change_ratio = np.mean(diff) / 255.0

        return change_ratio

    def _find_associated_events(self,
                                 timestamp: float,
                                 events: List[InputEvent]) -> List[InputEvent]:
        """找到时间窗口内的关联事件"""
        return [
            e for e in events
            if abs(e.timestamp - timestamp) <= self.event_window
        ]

# generated by hugo's coding agent
```

## Step 2: 使用多模态 AI 理解操作

### 2.1 构建分析 Prompt

```python
import base64
import io
from PIL import Image
from typing import List, Dict, Any

class OperationAnalyzer:
    """
    使用多模态 LLM 分析操作序列

    支持的模型：
    - OpenAI GPT-4 Vision
    - Anthropic Claude 3
    - Google Gemini Pro Vision
    """

    ANALYSIS_PROMPT = """你是一个 RPA 自动化专家。请分析以下屏幕截图序列，理解用户正在执行的操作。

对于每个截图：
1. 描述当前屏幕的状态
2. 识别用户点击/操作的元素
3. 推断用户的意图

最后，请将整个操作序列抽象为一个可重复执行的自动化流程。

输出格式（JSON）：
{
    "workflow_name": "流程名称",
    "description": "流程描述",
    "steps": [
        {
            "step_id": 1,
            "action": "click|type|scroll|wait|verify",
            "target": {
                "description": "目标元素的描述",
                "visual_features": ["视觉特征1", "特征2"],
                "text_content": "元素包含的文本（如有）",
                "relative_position": "相对位置描述"
            },
            "parameters": {
                "text": "要输入的文本（type 操作）",
                "direction": "滚动方向（scroll 操作）",
                "condition": "验证条件（verify 操作）"
            },
            "expected_result": "执行后的预期结果"
        }
    ],
    "preconditions": ["前置条件1", "前置条件2"],
    "error_handling": {
        "timeout": "超时处理策略",
        "element_not_found": "元素未找到处理策略"
    }
}
"""

    def __init__(self, model_provider: str = "openai", api_key: str = None):
        self.model_provider = model_provider
        self.api_key = api_key

    def _encode_image(self, image: np.ndarray) -> str:
        """将图像编码为 base64"""
        # 转换为 PIL Image
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(image_rgb)

        # 压缩并编码
        buffer = io.BytesIO()
        pil_image.save(buffer, format="JPEG", quality=85)
        return base64.b64encode(buffer.getvalue()).decode()

    def _build_messages(self, keyframes: List[KeyFrame]) -> List[Dict]:
        """构建多模态消息"""
        messages = [
            {"role": "system", "content": self.ANALYSIS_PROMPT}
        ]

        # 构建用户消息，包含所有关键帧
        content = []

        for i, kf in enumerate(keyframes):
            # 添加图像
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{self._encode_image(kf.image)}"
                }
            })

            # 添加事件信息
            events_desc = self._describe_events(kf.associated_events)
            content.append({
                "type": "text",
                "text": f"[截图 {i+1}] 时间: {kf.timestamp:.1f}s\n用户操作: {events_desc}"
            })

        messages.append({"role": "user", "content": content})
        return messages

    def _describe_events(self, events: List[InputEvent]) -> str:
        """描述事件列表"""
        if not events:
            return "无操作"

        descriptions = []
        for e in events:
            if e.event_type == "click":
                descriptions.append(f"点击 ({e.position[0]}, {e.position[1]})")
            elif e.event_type == "key_press":
                descriptions.append(f"按键 '{e.key}'")
            elif e.event_type == "scroll":
                dy = e.data.get("dy", 0)
                direction = "向上" if dy > 0 else "向下"
                descriptions.append(f"滚动 {direction}")

        return "; ".join(descriptions)

    def analyze(self, keyframes: List[KeyFrame]) -> Dict[str, Any]:
        """
        分析关键帧序列，生成自动化流程

        Args:
            keyframes: 关键帧列表

        Returns:
            解析后的流程定义
        """
        messages = self._build_messages(keyframes)

        if self.model_provider == "openai":
            return self._call_openai(messages)
        elif self.model_provider == "anthropic":
            return self._call_anthropic(messages)
        else:
            raise ValueError(f"Unsupported provider: {self.model_provider}")

    def _call_openai(self, messages: List[Dict]) -> Dict[str, Any]:
        """调用 OpenAI API"""
        from openai import OpenAI

        client = OpenAI(api_key=self.api_key)

        response = client.chat.completions.create(
            model="gpt-4-vision-preview",
            messages=messages,
            max_tokens=4096,
            response_format={"type": "json_object"}
        )

        return json.loads(response.choices[0].message.content)

    def _call_anthropic(self, messages: List[Dict]) -> Dict[str, Any]:
        """调用 Anthropic API"""
        import anthropic

        client = anthropic.Anthropic(api_key=self.api_key)

        # 转换消息格式
        claude_messages = self._convert_to_claude_format(messages)

        response = client.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=4096,
            messages=claude_messages
        )

        # 提取 JSON
        content = response.content[0].text
        # 尝试解析 JSON
        import re
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            return json.loads(json_match.group())
        return {"error": "Failed to parse response"}

    def _convert_to_claude_format(self, messages: List[Dict]) -> List[Dict]:
        """转换为 Claude 消息格式"""
        claude_messages = []

        for msg in messages:
            if msg["role"] == "system":
                # Claude 使用 system 参数而非消息
                continue
            elif msg["role"] == "user":
                content = []
                for item in msg["content"]:
                    if item["type"] == "text":
                        content.append({"type": "text", "text": item["text"]})
                    elif item["type"] == "image_url":
                        # 提取 base64 数据
                        url = item["image_url"]["url"]
                        data = url.split(",")[1]
                        content.append({
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": data
                            }
                        })
                claude_messages.append({"role": "user", "content": content})

        return claude_messages

# generated by hugo's coding agent
```

### 2.2 流程优化与验证

```python
@dataclass
class WorkflowStep:
    """工作流步骤"""
    step_id: int
    action: str  # click, type, scroll, wait, verify
    target: Dict[str, Any]
    parameters: Dict[str, Any]
    expected_result: str
    confidence: float = 1.0

@dataclass
class Workflow:
    """自动化工作流"""
    name: str
    description: str
    steps: List[WorkflowStep]
    preconditions: List[str]
    error_handling: Dict[str, str]

class WorkflowOptimizer:
    """
    工作流优化器

    功能：
    1. 合并冗余步骤
    2. 添加智能等待
    3. 验证流程完整性
    """

    def optimize(self, raw_workflow: Dict[str, Any]) -> Workflow:
        """优化原始工作流"""
        steps = []

        for step_data in raw_workflow.get("steps", []):
            step = WorkflowStep(
                step_id=step_data["step_id"],
                action=step_data["action"],
                target=step_data.get("target", {}),
                parameters=step_data.get("parameters", {}),
                expected_result=step_data.get("expected_result", "")
            )
            steps.append(step)

        # 优化步骤
        steps = self._merge_typing_steps(steps)
        steps = self._add_implicit_waits(steps)
        steps = self._add_verification_steps(steps)

        return Workflow(
            name=raw_workflow.get("workflow_name", "Unnamed"),
            description=raw_workflow.get("description", ""),
            steps=steps,
            preconditions=raw_workflow.get("preconditions", []),
            error_handling=raw_workflow.get("error_handling", {})
        )

    def _merge_typing_steps(self, steps: List[WorkflowStep]) -> List[WorkflowStep]:
        """合并连续的打字步骤"""
        merged = []
        typing_buffer = []

        for step in steps:
            if step.action == "type" and len(step.parameters.get("text", "")) == 1:
                typing_buffer.append(step.parameters["text"])
            else:
                if typing_buffer:
                    # 创建合并后的打字步骤
                    merged_step = WorkflowStep(
                        step_id=len(merged) + 1,
                        action="type",
                        target=steps[len(merged)].target if merged else {},
                        parameters={"text": "".join(typing_buffer)},
                        expected_result="Text entered"
                    )
                    merged.append(merged_step)
                    typing_buffer = []
                merged.append(step)

        if typing_buffer:
            merged_step = WorkflowStep(
                step_id=len(merged) + 1,
                action="type",
                target={},
                parameters={"text": "".join(typing_buffer)},
                expected_result="Text entered"
            )
            merged.append(merged_step)

        return merged

    def _add_implicit_waits(self, steps: List[WorkflowStep]) -> List[WorkflowStep]:
        """在可能导致页面变化的操作后添加等待"""
        result = []

        for step in steps:
            result.append(step)

            # 点击操作后可能需要等待
            if step.action == "click":
                wait_step = WorkflowStep(
                    step_id=len(result) + 1,
                    action="wait",
                    target={},
                    parameters={
                        "type": "smart",  # 智能等待
                        "max_timeout": 5.0,
                        "condition": step.expected_result
                    },
                    expected_result="Page loaded"
                )
                result.append(wait_step)

        return result

    def _add_verification_steps(self, steps: List[WorkflowStep]) -> List[WorkflowStep]:
        """添加关键验证步骤"""
        result = []

        for i, step in enumerate(steps):
            result.append(step)

            # 在最后一步后添加验证
            if i == len(steps) - 1:
                verify_step = WorkflowStep(
                    step_id=len(result) + 1,
                    action="verify",
                    target={},
                    parameters={
                        "condition": "workflow_completed",
                        "expected_state": step.expected_result
                    },
                    expected_result="Workflow verified"
                )
                result.append(verify_step)

        return result

# generated by hugo's coding agent
```

## Step 3: 智能执行引擎

### 3.1 视觉元素定位

传统 RPA 依赖固定坐标或 DOM 结构，而我们使用视觉+语义的方式定位元素。

```python
import cv2
import numpy as np
from typing import Optional, Tuple, List

class VisualElementLocator:
    """
    视觉元素定位器

    结合多种策略定位 UI 元素：
    1. 模板匹配
    2. OCR 文本定位
    3. 特征点匹配
    4. AI 语义定位
    """

    def __init__(self,
                 ocr_model=None,
                 vision_model=None):
        self.ocr_model = ocr_model
        self.vision_model = vision_model

    def locate(self,
               screenshot: np.ndarray,
               target: Dict[str, Any],
               reference_image: Optional[np.ndarray] = None) -> Optional[Tuple[int, int]]:
        """
        在屏幕截图中定位目标元素

        Args:
            screenshot: 当前屏幕截图
            target: 目标描述（来自流程定义）
            reference_image: 参考图像（录制时的截图）

        Returns:
            元素中心坐标 (x, y) 或 None
        """
        strategies = [
            ("text", self._locate_by_text),
            ("template", self._locate_by_template),
            ("features", self._locate_by_features),
            ("ai", self._locate_by_ai)
        ]

        for strategy_name, strategy_func in strategies:
            try:
                result = strategy_func(screenshot, target, reference_image)
                if result:
                    print(f"Located element using {strategy_name}: {result}")
                    return result
            except Exception as e:
                print(f"Strategy {strategy_name} failed: {e}")

        return None

    def _locate_by_text(self,
                        screenshot: np.ndarray,
                        target: Dict[str, Any],
                        reference: Optional[np.ndarray]) -> Optional[Tuple[int, int]]:
        """通过 OCR 文本定位"""
        text_content = target.get("text_content")
        if not text_content:
            return None

        # 使用 OCR 识别屏幕文字
        # 这里假设使用 PaddleOCR 或 EasyOCR
        if self.ocr_model is None:
            return None

        results = self.ocr_model.ocr(screenshot)

        for line in results:
            for word_info in line:
                box, (text, confidence) = word_info
                if text_content.lower() in text.lower() and confidence > 0.8:
                    # 计算中心点
                    x = int((box[0][0] + box[2][0]) / 2)
                    y = int((box[0][1] + box[2][1]) / 2)
                    return (x, y)

        return None

    def _locate_by_template(self,
                            screenshot: np.ndarray,
                            target: Dict[str, Any],
                            reference: Optional[np.ndarray]) -> Optional[Tuple[int, int]]:
        """通过模板匹配定位"""
        if reference is None:
            return None

        # 从参考图像中提取目标区域
        # 这里简化处理，实际应该根据 target 信息提取
        template = reference  # 应该是裁剪后的目标区域

        # 模板匹配
        result = cv2.matchTemplate(screenshot, template, cv2.TM_CCOEFF_NORMED)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)

        if max_val > 0.8:  # 相似度阈值
            h, w = template.shape[:2]
            x = max_loc[0] + w // 2
            y = max_loc[1] + h // 2
            return (x, y)

        return None

    def _locate_by_features(self,
                            screenshot: np.ndarray,
                            target: Dict[str, Any],
                            reference: Optional[np.ndarray]) -> Optional[Tuple[int, int]]:
        """通过特征点匹配定位"""
        if reference is None:
            return None

        # 使用 ORB 特征
        orb = cv2.ORB_create()

        kp1, des1 = orb.detectAndCompute(reference, None)
        kp2, des2 = orb.detectAndCompute(screenshot, None)

        if des1 is None or des2 is None:
            return None

        # 匹配特征点
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(des1, des2)

        if len(matches) < 10:
            return None

        # 计算匹配区域的中心
        good_matches = sorted(matches, key=lambda x: x.distance)[:20]

        points = [kp2[m.trainIdx].pt for m in good_matches]
        x = int(np.mean([p[0] for p in points]))
        y = int(np.mean([p[1] for p in points]))

        return (x, y)

    def _locate_by_ai(self,
                      screenshot: np.ndarray,
                      target: Dict[str, Any],
                      reference: Optional[np.ndarray]) -> Optional[Tuple[int, int]]:
        """通过 AI 视觉模型定位"""
        if self.vision_model is None:
            return None

        description = target.get("description", "")
        visual_features = target.get("visual_features", [])

        prompt = f"""在这张屏幕截图中，请找到以下元素并返回其坐标：

元素描述：{description}
视觉特征：{', '.join(visual_features)}

请返回元素中心点的坐标，格式：{{"x": 数字, "y": 数字}}
如果找不到，返回：{{"x": null, "y": null}}
"""

        # 调用视觉模型（简化示例）
        response = self.vision_model.analyze(screenshot, prompt)

        if response.get("x") and response.get("y"):
            return (int(response["x"]), int(response["y"]))

        return None

# generated by hugo's coding agent
```

### 3.2 动作执行器

```python
import pyautogui
import time
from typing import Optional, Dict, Any

class ActionExecutor:
    """
    动作执行器

    支持的动作类型：
    - click: 点击
    - double_click: 双击
    - right_click: 右键点击
    - type: 输入文本
    - scroll: 滚动
    - wait: 等待
    - hotkey: 组合键
    """

    def __init__(self,
                 locator: VisualElementLocator,
                 default_timeout: float = 10.0,
                 retry_interval: float = 0.5):
        self.locator = locator
        self.default_timeout = default_timeout
        self.retry_interval = retry_interval

        # 配置 pyautogui
        pyautogui.PAUSE = 0.1  # 动作间隔
        pyautogui.FAILSAFE = True  # 启用故障安全

    def execute(self,
                step: WorkflowStep,
                context: Dict[str, Any] = None) -> bool:
        """
        执行单个工作流步骤

        Args:
            step: 工作流步骤
            context: 执行上下文

        Returns:
            执行是否成功
        """
        action = step.action

        action_handlers = {
            "click": self._execute_click,
            "double_click": self._execute_double_click,
            "right_click": self._execute_right_click,
            "type": self._execute_type,
            "scroll": self._execute_scroll,
            "wait": self._execute_wait,
            "hotkey": self._execute_hotkey,
            "verify": self._execute_verify
        }

        handler = action_handlers.get(action)
        if handler is None:
            print(f"Unknown action: {action}")
            return False

        try:
            return handler(step, context)
        except Exception as e:
            print(f"Action {action} failed: {e}")
            return False

    def _locate_with_retry(self,
                           target: Dict[str, Any],
                           timeout: float = None) -> Optional[Tuple[int, int]]:
        """带重试的元素定位"""
        timeout = timeout or self.default_timeout
        start_time = time.time()

        while time.time() - start_time < timeout:
            screenshot = pyautogui.screenshot()
            screenshot = np.array(screenshot)
            screenshot = cv2.cvtColor(screenshot, cv2.COLOR_RGB2BGR)

            position = self.locator.locate(screenshot, target)
            if position:
                return position

            time.sleep(self.retry_interval)

        return None

    def _execute_click(self, step: WorkflowStep, context: Dict) -> bool:
        """执行点击"""
        position = self._locate_with_retry(step.target)
        if position is None:
            print(f"Cannot locate element for click: {step.target}")
            return False

        pyautogui.click(position[0], position[1])
        return True

    def _execute_double_click(self, step: WorkflowStep, context: Dict) -> bool:
        """执行双击"""
        position = self._locate_with_retry(step.target)
        if position is None:
            return False

        pyautogui.doubleClick(position[0], position[1])
        return True

    def _execute_right_click(self, step: WorkflowStep, context: Dict) -> bool:
        """执行右键点击"""
        position = self._locate_with_retry(step.target)
        if position is None:
            return False

        pyautogui.rightClick(position[0], position[1])
        return True

    def _execute_type(self, step: WorkflowStep, context: Dict) -> bool:
        """执行输入"""
        text = step.parameters.get("text", "")

        # 支持变量替换
        if context:
            for key, value in context.items():
                text = text.replace(f"{{{key}}}", str(value))

        # 如果有目标元素，先点击
        if step.target:
            position = self._locate_with_retry(step.target)
            if position:
                pyautogui.click(position[0], position[1])
                time.sleep(0.2)

        # 使用 pyperclip 处理中文
        import pyperclip
        pyperclip.copy(text)
        pyautogui.hotkey('ctrl', 'v')

        return True

    def _execute_scroll(self, step: WorkflowStep, context: Dict) -> bool:
        """执行滚动"""
        direction = step.parameters.get("direction", "down")
        amount = step.parameters.get("amount", 3)

        if direction == "up":
            pyautogui.scroll(amount)
        else:
            pyautogui.scroll(-amount)

        return True

    def _execute_wait(self, step: WorkflowStep, context: Dict) -> bool:
        """执行等待"""
        wait_type = step.parameters.get("type", "fixed")

        if wait_type == "fixed":
            duration = step.parameters.get("duration", 1.0)
            time.sleep(duration)
            return True

        elif wait_type == "smart":
            # 智能等待：等待页面稳定
            max_timeout = step.parameters.get("max_timeout", 5.0)
            return self._wait_for_stable(max_timeout)

        elif wait_type == "element":
            # 等待元素出现
            target = step.parameters.get("target", step.target)
            max_timeout = step.parameters.get("max_timeout", 10.0)
            return self._locate_with_retry(target, max_timeout) is not None

        return True

    def _wait_for_stable(self, timeout: float) -> bool:
        """等待页面稳定（画面不再变化）"""
        start_time = time.time()
        prev_screenshot = None
        stable_count = 0

        while time.time() - start_time < timeout:
            screenshot = np.array(pyautogui.screenshot())

            if prev_screenshot is not None:
                # 比较两帧
                diff = np.abs(screenshot.astype(float) - prev_screenshot.astype(float))
                change_ratio = np.mean(diff) / 255.0

                if change_ratio < 0.01:
                    stable_count += 1
                    if stable_count >= 3:  # 连续3次稳定
                        return True
                else:
                    stable_count = 0

            prev_screenshot = screenshot
            time.sleep(0.2)

        return True  # 超时也返回 True，继续执行

    def _execute_hotkey(self, step: WorkflowStep, context: Dict) -> bool:
        """执行组合键"""
        keys = step.parameters.get("keys", [])
        if keys:
            pyautogui.hotkey(*keys)
        return True

    def _execute_verify(self, step: WorkflowStep, context: Dict) -> bool:
        """执行验证"""
        condition = step.parameters.get("condition", "")

        if condition == "element_exists":
            target = step.parameters.get("target", step.target)
            return self._locate_with_retry(target, timeout=3.0) is not None

        elif condition == "text_visible":
            expected_text = step.parameters.get("expected_text", "")
            # 使用 OCR 验证文本
            screenshot = np.array(pyautogui.screenshot())
            # ... OCR 验证逻辑
            return True

        return True

# generated by hugo's coding agent
```

## Step 4: 工作流编排与调度

### 4.1 工作流运行器

```python
from enum import Enum
from dataclasses import dataclass, field
from typing import Callable, Dict, Any, List
import logging

class ExecutionStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class ExecutionResult:
    """执行结果"""
    workflow_name: str
    status: ExecutionStatus
    steps_completed: int
    total_steps: int
    error_message: Optional[str] = None
    execution_time: float = 0.0
    step_results: List[Dict] = field(default_factory=list)

class WorkflowRunner:
    """
    工作流运行器

    功能：
    - 执行工作流
    - 错误处理与重试
    - 断点恢复
    - 执行日志
    """

    def __init__(self,
                 executor: ActionExecutor,
                 max_retries: int = 3,
                 screenshot_on_error: bool = True):
        self.executor = executor
        self.max_retries = max_retries
        self.screenshot_on_error = screenshot_on_error

        self.logger = logging.getLogger("WorkflowRunner")
        self._callbacks: Dict[str, List[Callable]] = {
            "on_step_start": [],
            "on_step_complete": [],
            "on_step_error": [],
            "on_workflow_complete": []
        }

    def register_callback(self, event: str, callback: Callable):
        """注册回调函数"""
        if event in self._callbacks:
            self._callbacks[event].append(callback)

    def _emit(self, event: str, *args, **kwargs):
        """触发事件"""
        for callback in self._callbacks.get(event, []):
            try:
                callback(*args, **kwargs)
            except Exception as e:
                self.logger.error(f"Callback error: {e}")

    def run(self,
            workflow: Workflow,
            context: Dict[str, Any] = None,
            start_from: int = 0) -> ExecutionResult:
        """
        运行工作流

        Args:
            workflow: 工作流定义
            context: 执行上下文（变量）
            start_from: 从第几步开始（用于断点恢复）

        Returns:
            执行结果
        """
        context = context or {}
        start_time = time.time()
        step_results = []

        self.logger.info(f"Starting workflow: {workflow.name}")

        # 检查前置条件
        if not self._check_preconditions(workflow.preconditions):
            return ExecutionResult(
                workflow_name=workflow.name,
                status=ExecutionStatus.FAILED,
                steps_completed=0,
                total_steps=len(workflow.steps),
                error_message="Preconditions not met"
            )

        # 执行步骤
        for i, step in enumerate(workflow.steps[start_from:], start=start_from):
            step_start = time.time()
            self._emit("on_step_start", step, i)

            success = False
            error_msg = None

            # 重试逻辑
            for attempt in range(self.max_retries):
                try:
                    success = self.executor.execute(step, context)
                    if success:
                        break
                except Exception as e:
                    error_msg = str(e)
                    self.logger.warning(f"Step {i} attempt {attempt + 1} failed: {e}")

                if attempt < self.max_retries - 1:
                    time.sleep(1.0)  # 重试前等待

            step_result = {
                "step_id": step.step_id,
                "action": step.action,
                "success": success,
                "duration": time.time() - step_start,
                "error": error_msg
            }
            step_results.append(step_result)

            if success:
                self._emit("on_step_complete", step, i, step_result)
                self.logger.info(f"Step {i} completed: {step.action}")
            else:
                self._emit("on_step_error", step, i, error_msg)
                self.logger.error(f"Step {i} failed: {step.action}")

                # 保存错误截图
                if self.screenshot_on_error:
                    self._save_error_screenshot(workflow.name, i)

                # 应用错误处理策略
                should_continue = self._handle_error(workflow, step, error_msg)
                if not should_continue:
                    return ExecutionResult(
                        workflow_name=workflow.name,
                        status=ExecutionStatus.FAILED,
                        steps_completed=i,
                        total_steps=len(workflow.steps),
                        error_message=error_msg,
                        execution_time=time.time() - start_time,
                        step_results=step_results
                    )

        result = ExecutionResult(
            workflow_name=workflow.name,
            status=ExecutionStatus.SUCCESS,
            steps_completed=len(workflow.steps),
            total_steps=len(workflow.steps),
            execution_time=time.time() - start_time,
            step_results=step_results
        )

        self._emit("on_workflow_complete", workflow, result)
        self.logger.info(f"Workflow completed: {workflow.name}")

        return result

    def _check_preconditions(self, preconditions: List[str]) -> bool:
        """检查前置条件"""
        # 简化实现，实际应该有更复杂的条件检查
        return True

    def _handle_error(self,
                      workflow: Workflow,
                      step: WorkflowStep,
                      error: str) -> bool:
        """处理错误，返回是否继续执行"""
        error_handling = workflow.error_handling

        if "element_not_found" in error.lower():
            strategy = error_handling.get("element_not_found", "stop")
        elif "timeout" in error.lower():
            strategy = error_handling.get("timeout", "stop")
        else:
            strategy = error_handling.get("default", "stop")

        return strategy == "skip" or strategy == "continue"

    def _save_error_screenshot(self, workflow_name: str, step_index: int):
        """保存错误截图"""
        import os

        os.makedirs("error_screenshots", exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        path = f"error_screenshots/{workflow_name}_{step_index}_{timestamp}.png"

        screenshot = pyautogui.screenshot()
        screenshot.save(path)
        self.logger.info(f"Error screenshot saved: {path}")

# generated by hugo's coding agent
```

### 4.2 调度器

```python
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from typing import Dict, Any

class WorkflowScheduler:
    """
    工作流调度器

    支持：
    - Cron 表达式调度
    - 间隔调度
    - 事件触发
    - 手动触发
    """

    def __init__(self, runner: WorkflowRunner):
        self.runner = runner
        self.scheduler = BackgroundScheduler()
        self.workflows: Dict[str, Workflow] = {}

    def register_workflow(self, workflow: Workflow):
        """注册工作流"""
        self.workflows[workflow.name] = workflow

    def schedule_cron(self,
                      workflow_name: str,
                      cron_expression: str,
                      context: Dict[str, Any] = None):
        """
        使用 Cron 表达式调度

        Args:
            workflow_name: 工作流名称
            cron_expression: Cron 表达式（如 "0 9 * * *" 每天9点）
            context: 执行上下文
        """
        workflow = self.workflows.get(workflow_name)
        if not workflow:
            raise ValueError(f"Workflow not found: {workflow_name}")

        parts = cron_expression.split()
        trigger = CronTrigger(
            minute=parts[0],
            hour=parts[1],
            day=parts[2],
            month=parts[3],
            day_of_week=parts[4]
        )

        self.scheduler.add_job(
            func=self._run_workflow,
            trigger=trigger,
            args=[workflow_name, context],
            id=f"cron_{workflow_name}",
            replace_existing=True
        )

    def schedule_interval(self,
                          workflow_name: str,
                          hours: int = 0,
                          minutes: int = 0,
                          seconds: int = 0,
                          context: Dict[str, Any] = None):
        """
        间隔调度

        Args:
            workflow_name: 工作流名称
            hours, minutes, seconds: 间隔时间
            context: 执行上下文
        """
        workflow = self.workflows.get(workflow_name)
        if not workflow:
            raise ValueError(f"Workflow not found: {workflow_name}")

        trigger = IntervalTrigger(
            hours=hours,
            minutes=minutes,
            seconds=seconds
        )

        self.scheduler.add_job(
            func=self._run_workflow,
            trigger=trigger,
            args=[workflow_name, context],
            id=f"interval_{workflow_name}",
            replace_existing=True
        )

    def _run_workflow(self, workflow_name: str, context: Dict[str, Any]):
        """执行工作流"""
        workflow = self.workflows.get(workflow_name)
        if workflow:
            result = self.runner.run(workflow, context)
            print(f"Workflow {workflow_name} completed: {result.status}")

    def start(self):
        """启动调度器"""
        self.scheduler.start()
        print("Scheduler started")

    def stop(self):
        """停止调度器"""
        self.scheduler.shutdown()
        print("Scheduler stopped")

    def run_now(self, workflow_name: str, context: Dict[str, Any] = None):
        """立即运行工作流"""
        return self._run_workflow(workflow_name, context)

# generated by hugo's coding agent
```

## 完整使用示例

```python
def main():
    """完整的录屏 RPA 使用示例"""

    # 1. 录制用户操作
    print("=== 步骤 1: 录制操作 ===")
    recorder = ScreenRecorder(output_dir="./recordings", fps=10)

    input("按 Enter 开始录制，再次按 Enter 停止...")
    video_path = recorder.start_recording("demo_workflow")

    input("正在录制... 按 Enter 停止")
    session = recorder.stop_recording()

    # 2. 提取关键帧
    print("\n=== 步骤 2: 提取关键帧 ===")
    extractor = KeyFrameExtractor()
    keyframes = extractor.extract(session.video_path, session.events)

    # 3. AI 分析操作
    print("\n=== 步骤 3: AI 分析 ===")
    analyzer = OperationAnalyzer(
        model_provider="openai",
        api_key="your-api-key"
    )
    raw_workflow = analyzer.analyze(keyframes)

    # 4. 优化工作流
    print("\n=== 步骤 4: 优化工作流 ===")
    optimizer = WorkflowOptimizer()
    workflow = optimizer.optimize(raw_workflow)

    print(f"工作流: {workflow.name}")
    print(f"步骤数: {len(workflow.steps)}")
    for step in workflow.steps:
        print(f"  {step.step_id}. {step.action}: {step.target.get('description', '')}")

    # 5. 保存工作流
    workflow_path = f"./workflows/{workflow.name}.json"
    save_workflow(workflow, workflow_path)

    # 6. 执行工作流
    print("\n=== 步骤 5: 执行工作流 ===")
    locator = VisualElementLocator()
    executor = ActionExecutor(locator)
    runner = WorkflowRunner(executor)

    # 添加回调
    runner.register_callback(
        "on_step_complete",
        lambda step, i, result: print(f"  ✓ Step {i}: {step.action}")
    )

    result = runner.run(workflow)

    print(f"\n执行结果: {result.status}")
    print(f"完成步骤: {result.steps_completed}/{result.total_steps}")
    print(f"耗时: {result.execution_time:.1f}s")

    # 7. 设置定时任务（可选）
    print("\n=== 步骤 6: 设置调度 ===")
    scheduler = WorkflowScheduler(runner)
    scheduler.register_workflow(workflow)

    # 每天早上9点执行
    scheduler.schedule_cron(workflow.name, "0 9 * * *")

    scheduler.start()
    print("调度已启动，按 Ctrl+C 退出")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        scheduler.stop()

if __name__ == "__main__":
    main()

# generated by hugo's coding agent
```

## 最佳实践总结

### 录制阶段

1. **稳定的操作节奏**：录制时保持适度的操作速度，避免过快
2. **明确的等待**：在页面加载后稍作停顿，让系统捕获完整状态
3. **避免拖拽**：拖拽操作识别困难，尽量使用点击替代
4. **一致的窗口状态**：保持窗口最大化，避免尺寸变化

### 分析阶段

1. **提供业务上下文**：让 AI 理解操作的业务意义
2. **验证生成的流程**：人工检查 AI 生成的步骤是否完整
3. **添加异常处理**：为可能失败的步骤定义降级策略

### 执行阶段

1. **智能等待**：使用页面稳定检测而非固定延时
2. **多策略定位**：结合文本、视觉、语义多种方式
3. **错误恢复**：实现断点续执行能力
4. **日志记录**：详细记录每步执行情况

### 运维阶段

1. **监控告警**：实时监控执行状态，失败时及时告警
2. **版本管理**：工作流定义纳入版本控制
3. **定期校验**：UI 变化后及时更新工作流
4. **性能优化**：分析执行日志，优化慢操作

## 结语

通过桌面录屏实现 RPA 自动化，本质上是将人类的操作经验转化为可执行的自动化流程。这种方式结合了多模态 AI 的理解能力和传统 RPA 的执行能力，让自动化变得更加智能和易用。

随着视觉语言模型的发展，未来的 RPA 系统将能够：

- 理解更复杂的操作意图
- 自动适应 UI 变化
- 处理更多异常情况
- 实现真正的"所见即所得"自动化

这不仅降低了自动化的技术门槛，也为企业数字化转型提供了新的可能。
