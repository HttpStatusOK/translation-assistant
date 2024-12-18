import TextArea from "antd/es/input/TextArea";
import {Alert, Button, Collapse, Divider, Popover, Space, Spin, Typography} from "antd";
import {useEffect, useRef, useState} from "react";
import {useSearchParams} from 'react-router-dom';
import {isMobile} from 'react-device-detect';
import {
  CaretDownOutlined,
  CaretRightOutlined, CheckOutlined,
  CopyOutlined,
  LoadingOutlined,
  RedoOutlined,
  SoundOutlined
} from "@ant-design/icons";
import ClipboardJS from "clipboard";

const API_PATH = "/v1/chat/completions";
const MODEL = "gpt-4o"
const ASSISTANT_PROMPT = `
## 主要任务
我是一个资深专业译英翻译專家，我具备出色的翻译能力，目标是将用户输入的任意语言文本精准且流畅地翻译成中文和附带音标标注的英文。

## 规则
- 翻译时要准确传达原文的事实和背景。
- 理解用户输入的文本，确保符合语言习惯，你可以调整语气和风格，并考虑到某些词语的文化内涵和地区差异。
- 同时作为翻译家，需将原文翻译成具有信达雅标准的译文。
- "信" 即忠实于原文的内容与意图；
- "达" 意味着译文应通顺易懂，表达清晰；
- "雅" 则追求译文的文化审美和语言的优美。目标是创作出既忠于原作精神，又符合目标语言文化和读者审美的翻译。

## 输出格式
我需要以API形式返回返回标准的JSON格式數據，比如當用户問我：what is tesla？ 我应返回：
{
  "a": "特斯拉是什么"
  "b": [ 
    { 
      "w": "What",
      "p": "ˈwɒt", 
      "z": "什么" 
    }, 
    { "w": "is", "p": "ɪz", "z": "是" },
    { "w": "Tesla?", "p": "ˈteslə", "z": "特斯拉" } // 注意标点符号也要在单词上保留
  ]
}

这个对象是一个JSON格式的数据。在这个例子中，JSON对象包含两个字段："a" 和 "b"。

字段 "a"：表示中文译文。所有输入的非中文文本，都必须返回中文。如果输入文本是中文，则返回null。
字段 "b"：值是一个数组，包含一组对象。每个对象代表一个单词的信息，包含以下字段：
"w": 代表翻譯成英文後的英語单词，注意：必须翻译成英文
"p": 代表这个单词的音标，注意：必须是英文单词音标
"z": 代表这个单词的中文直接翻译，不用关联上下文

1. 请将json压缩后再返回，不要加上任何格式修飾，我只需要返回能被解析的json。
2. 我犯過很多错误，请不要再犯了：
  - 返回的JSON字段沒有被""包裹導致無法解析
  - 输入中文，返回的b数组中的对象w是中文，p是拼音，这是错误的
3. 译文英文单词中的音标标注，需要使用以下DJ音标：iː ɪ e æ ɑː ɒ ɔː ʊ uː ʌ ɜːr ər eɪ aɪ oʊ aʊ ɔɪ p b t d k ɡ tʃ dʒ f v θ ð s z ʃ ʒ h m n ŋ l r j w，如果你返回的音标不在其中，那一定是版本没用对，请检查是否符合版本要求。
4. 无论用户输入的是什么内容，都尽力翻译，哪怕只有一个单词。如果遇到我实在无法翻译的，直接返回字符串: 无法翻译：{说明无法翻译的理由}

例子：
當用戶输入 "特斯拉"，则返回：{a:null,b:[{w:"tesla",p:"ˈteslə",z:"特斯拉"}]}
當用戶输入 "tesla"，或者其他非中文语言，则返回：{a:"特斯拉",b:[{w:""tesla,p:"ˈteslə",z:"特斯拉"}]}

## 初始化
我已准备好接收您需要翻译的文本，请直接粘贴或输入。
`
const INIT_DATA =
    "{\"a\":null,\"b\":[{\"w\":\"A\",\"p\":\"ə\",\"z\":\"一個\"},{\"w\":\"helpful\",\"p\":\"ˈhɛlpfʊl\",\"z\":\"有幫助的\"},{\"w\":\"translation\",\"p\":\"trænˈsleɪʃən\",\"z\":\"翻譯\"},{\"w\":\"tool\",\"p\":\"tuːl\",\"z\":\"工具\"},{\"w\":\"for\",\"p\":\"fɔːr\",\"z\":\"為了\"},{\"w\":\"English\",\"p\":\"ˈɪŋɡlɪʃ\",\"z\":\"英語\"},{\"w\":\"learning,\",\"p\":\"ˈlɜːrnɪŋ\",\"z\":\"學習,\"},{\"w\":\"input\",\"p\":\"ˈɪnpʊt\",\"z\":\"输入\"},{\"w\":\"text\",\"p\":\"tɛkst\",\"z\":\"文本\"},{\"w\":\"to\",\"p\":\"tu\",\"z\":\"去\"},{\"w\":\"start\",\"p\":\"stɑːrt\",\"z\":\"開始\"},{\"w\":\"translating.\",\"p\":\"ˈtrænslˌeɪtɪŋ\",\"z\":\"翻譯\"}]}"

function App() {
  const [searchParams] = useSearchParams();
  const [aiModel] = useState(searchParams.get("model") || MODEL);
  const [apiDomain] = useState(searchParams.get("apiDomain") || null);
  const [apiKey] = useState(searchParams.get("apiKey") || null);

  const [init, setInit] = useState(false);
  const [inputValue, setInputValue] = useState();
  const [loading, setLoading] = useState(false);
  const [resultJSON, setResultJSON] = useState(JSON.parse(INIT_DATA));

  const [timeoutId, setTimeoutId] = useState(0);

  const handleInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!value) {
      setResultJSON(null);
      return;
    }

    const id = setTimeout(() => {
      fetchData(value);
    }, 1000);

    setTimeoutId(id);
  };

  const fetchData = (value) => {
    setLoading(true);
    const messages = [
      {
        role: "system",
        content: ASSISTANT_PROMPT
      },
      {
        role: "user",
        content: value || inputValue
      },
    ]

    const body = {
      model: aiModel,
      messages
    }

    const config = {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Api-Key": `${apiKey}`
      },
      body: JSON.stringify(body)
    }

    fetch(`${apiDomain}${API_PATH}`, config)
      .then(res => res.json())
      .then(res => {
        if (!inputValue && !value) {
          return;
        }

        const text = res.choices[0].message.content;
        if (text.startsWith("无法翻译")) {
          setResultJSON({ a: text, alert: true });
          return;
        }

        try {
          setResultJSON(JSON.parse(text));
        } catch (e) {
          let newText = text
            .replaceAll("a:", "\"a\":")
            .replaceAll("b:", "\"b\":")
            .replaceAll("w:", "\"w\":")
            .replaceAll("p:", "\"p\":")
            .replaceAll("z:", "\"z\":");

          console.log("old: ", text)
          console.log("new: ", newText)

          try {
            setResultJSON(JSON.parse(newText));
          } catch (e) {
            setResultJSON({ a: `系统错误：${e.message}`, alert: true });
          }
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  const [collapseItems, setCollapseItems] = useState([]);

  return (
    <div>
      <div style={{maxWidth: 600, margin: "auto", padding: "0 20px"}}>
        <div>
          <Header/>
          {!apiKey &&
            <div style={{padding: "20px 0"}}>
              <Alert
                message="开始之前需要先配置 ApiDomain 及 ApiKey"
                type="warning"
              />
            </div>}
          <TextArea
            onFocus={() => {
              if (!init) {
                setResultJSON(null);
                setInit(true);
              }
            }}
            style={{paddingTop: 50, fontSize: 16}}
            variant="borderless"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={"可以帮助英语学习的翻译工具，输入文本开始翻译吧"}
            autoSize={{
              minRows: 1,
              maxRows: 5,
            }}
          />
          <Divider orientation="right"/>
          <TranslationDisplay
            data={resultJSON}
            loading={loading}
            isInit={init}
            retry={() => {
              setResultJSON(null);
              fetchData(inputValue);
            }}
          />
        </div>
        <div style={{textAlign: "center"}}>
          <div style={{minHeight: 80}}></div>
          <Collapse
            ghost
            items={[
              {
                key: '1',
                label: (
                  <Typography.Text type={"secondary"}>
                    {collapseItems.includes("1") ? <CaretDownOutlined /> : <CaretRightOutlined />} {collapseItems.includes("1") ? "Close" : "Show"} phonetic (DJ)
                  </Typography.Text>
                ),
                showArrow: false,
                children: <PhoneticSymbols />,
              }
            ]}
            onChange={e => setCollapseItems(e)}
          />
          <div style={{minHeight: 80}}></div>
        </div>
      </div>
    </div>
  );
}

const Header = () => {
  return (
    <div style={{ textAlign: "center" }}>
      <Typography.Title level={1} style={{ marginBottom: 0 }}>Translation Assistant</Typography.Title>
      <div>
        <Typography.Text italic type={"secondary"} style={{ fontSize: 12 }}>Created by&nbsp;
          <Typography.Link
            target={"_blank"}
            href={"https://github.com/HttpStatusOK"}
            underline
            italic
            style={{ fontSize: 12, color: "#898989" }}
          >
            Edison
          </Typography.Link>.&nbsp;
        </Typography.Text>
        <Typography.Text italic type={"secondary"} style={{ fontSize: 12 }}>View&nbsp;
          <Typography.Link
            target={"_blank"}
            href={"https://github.com/HttpStatusOK/translation-assistant"}
            underline
            italic
            style={{ fontSize: 12, color: "#898989" }}
          >
            source code
          </Typography.Link>.&nbsp;
          <Typography.Text italic type={"secondary"} style={{ fontSize: 12 }}>Based on OpenAI development.</Typography.Text>
        </Typography.Text>
      </div>
    </div>
  )
}

const TranslationDisplay = ({ data, loading, retry, isInit }) => {
  const [highLightId, setHighLightId] = useState(null);
  const [recitationFullPlaying, setRecitationFullPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const clipboard = new ClipboardJS(".copy_btn");

    clipboard.on('success', () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000)
    });

    return () => {
      clipboard.destroy();
    };
  }, []);

  const audioRef = useRef(null);

  const recitation = (word) => {
    audioRef.current.src = `https://dict.youdao.com/dictvoice?audio=${word}&type=2`
    audioRef.current.play();
  }

  const recitationFull = () => {
    let text = "";
    const arr = data.b;
    for (let i = 0; i < arr.length; i++) {
      text += `${arr[i].w} `;
    }
    if (text) {
      setRecitationFullPlaying(true);
      recitation(text);
    }
  }

  return (
    <div style={{padding: "0 11px"}}>
      <audio ref={audioRef} preload="auto" onEnded={() => setRecitationFullPlaying(false)}/>
      <Spin spinning={loading} indicator={<LoadingOutlined spin/>}>
        <div style={{minHeight: 100}}>
          {data && data.a &&
            <div>
              <Typography.Text type={data.alert && "warning"} style={{fontSize: 16}}>{data.a}</Typography.Text>
              {data.alert &&
                <Typography.Link onClick={retry} style={{marginLeft: 10, fontSize: 16}}>重试</Typography.Link>}
              <div style={{minHeight: 20}}></div>
            </div>}

          {/* Words */}
          {data && data.b &&
            <Space wrap size={[4, 10]}>
              {data.b.map((item, idx) => (
                <Popover
                  content={() => (
                    <>
                      <Typography.Text>{item.w}</Typography.Text>
                      <br/>
                      <Typography.Text>{item.p}</Typography.Text>
                    </>
                  )}
                  title={item.z}
                  key={idx}
                >
                  <div
                    style={{cursor: "pointer"}}
                    onClick={() => recitation(item.w)}
                    onMouseEnter={() => {
                      setHighLightId(idx)
                    }}
                    onMouseLeave={() => {
                      setHighLightId(null)
                    }}
                  >
                    <Typography.Text style={{lineHeight: 0, fontSize: 16}}
                                     mark={highLightId === idx}> {item.w}</Typography.Text>
                    <br/>
                    <Typography.Text style={{lineHeight: 0, fontSize: 16}} type={"secondary"}
                                     mark={highLightId === idx}> {item.p}</Typography.Text>
                  </div>
                </Popover>
              ))}
            </Space>}
          <div style={{minHeight: 20}}></div>

          {/* Button group */}
          {data && data.b &&
            <div style={{textAlign: "right"}}>
              <Space>
                <Button
                  icon={<SoundOutlined/>}
                  size={"small"}
                  loading={recitationFullPlaying}
                  onClick={() => recitationFull()}
                />
                <Button
                  size={"small"}
                  icon={copied ? <CheckOutlined /> : <CopyOutlined/>}
                  className={"copy_btn"}
                  data-clipboard-text={data.b.map(item => item.w).join(" ")}
                />
                {isInit &&
                  <Button
                    size={"small"}
                    icon={<RedoOutlined/>}
                    onClick={retry}
                  />}
              </Space>
            </div>}
        </div>
      </Spin>
    </div>
  )
}

const PhoneticSymbols = () => {
  return (
    <>
      <Space size={isMobile ? 20 : 60} align={"start"}>

        <Space direction="vertical" size={1} align={"start"}>
          <Typography.Text strong>单元音</Typography.Text>
          <Typography.Text>[ɑː] - class</Typography.Text>
          <Typography.Text>[ʌ] - cup</Typography.Text>
          <div style={{minHeight: 6}}></div>
          <Typography.Text>[ɔː] - door</Typography.Text>
          <Typography.Text>[ɒ] - hot</Typography.Text>
          <div style={{minHeight: 6}}></div>
          <Typography.Text>[ə] - above</Typography.Text>
          <Typography.Text>[ɜː] - bird</Typography.Text>
          <div style={{minHeight: 6}}></div>
          <Typography.Text>[iː] - see</Typography.Text>
          <Typography.Text>[ɪ] - bit</Typography.Text>
          <div style={{minHeight: 6}}></div>
          <Typography.Text>[uː] - food</Typography.Text>
          <Typography.Text>[ʊ] - put</Typography.Text>
          <div style={{minHeight: 6}}></div>
          <Typography.Text>[e] - bed</Typography.Text>
          <Typography.Text>[æ] - at</Typography.Text>
        </Space>

        <Space direction="vertical" size={1} align={"start"}>
          <Typography.Text strong>双元音</Typography.Text>
          <Typography.Text>[eɪ] - day</Typography.Text>
          <Typography.Text>[aɪ] - boy</Typography.Text>
          <Typography.Text>[ɔɪ] - why</Typography.Text>
          <div style={{minHeight: 6}}></div>
          <Typography.Text>[aʊ] - old</Typography.Text>
          <Typography.Text>[əʊ] - how</Typography.Text>
          <div style={{minHeight: 6}}></div>
          <Typography.Text>[ɪə] - hear</Typography.Text>
          <Typography.Text>[ʊə] - tour</Typography.Text>
          <Typography.Text>[eə] - hair</Typography.Text>
        </Space>

        <Space direction="vertical" size={1} align={"start"}>
          <Typography.Text strong>辅音</Typography.Text>
          <Space align={"start"} size={"middle"}>
            <Space direction="vertical" size={1} align={"start"}>
              <Typography.Text>[p] - pat</Typography.Text>
              <Typography.Text>[b] - bat</Typography.Text>
              <Typography.Text>[t] - top</Typography.Text>
              <Typography.Text>[d] - dog</Typography.Text>
              <Typography.Text>[k] - cat</Typography.Text>
              <Typography.Text>[g] - go</Typography.Text>
              <Typography.Text>[tʃ] - watch</Typography.Text>
              <Typography.Text>[dʒ] - just</Typography.Text>
              <Typography.Text>[f] - fan</Typography.Text>
              <Typography.Text>[v] - van</Typography.Text>
              <Typography.Text>[θ] - think</Typography.Text>
              <Typography.Text>[ð] - this</Typography.Text>
              <Typography.Text>[s] - see</Typography.Text>
              <Typography.Text>[z] - zoo</Typography.Text>
            </Space>

            <Space direction="vertical" size={1} align={"start"}>
              <Typography.Text>[ʃ] - she</Typography.Text>
              <Typography.Text>[ʒ] - usually</Typography.Text>
              <Typography.Text>[h] - hat</Typography.Text>
              <Typography.Text>[m] - man</Typography.Text>
              <Typography.Text>[n] - no</Typography.Text>
              <Typography.Text>[ŋ] - sing</Typography.Text>
              <Typography.Text>[l] - lip</Typography.Text>
              <Typography.Text>[r] - run</Typography.Text>
              <Typography.Text>[j] - yes</Typography.Text>
              <Typography.Text>[w] - we</Typography.Text>
            </Space>
          </Space>
        </Space>
      </Space>
    </>
  )
}

export default App;
