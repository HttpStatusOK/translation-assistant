import TextArea from "antd/es/input/TextArea";
import {Alert, Divider, message, Skeleton, Space, Spin, Typography} from "antd";
import {useEffect, useState} from "react";
import {useSearchParams} from 'react-router-dom';

const API_PATH = "/v1/chat/completions";

function App() {
  const [searchParams] = useSearchParams();

  const [apiDomain] = useState(searchParams.get("apiDomain") || null);
  const [apiKey] = useState(searchParams.get("apiKey") || null);

  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [resultJSON, setResultJSON] = useState(null);

  const [professionalModel] = useState(false);

  const [timeoutId, setTimeoutId] = useState(0);

  const handleInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value.replaceAll("\n", ""));

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!value) {
      setResult(null);
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

    const simple = "你是一名翻译专家，你要做的是将我发送的每一句话翻译成英文，无论是什么内容，要求第一行返回英文译文，第二行返回对应的DJ音标（Daniel Jones，亦即英式音标）";
    const professional = "你是一条翻译API，你要做的是将我发送的每一句话翻译成英文，无论是什么内容，要求返回经过分词的JSON数组：a是原文，b是译文，c是译文对应DJ音标。参考格式 \"a\":[{\"id\":1,\"text\":\"特斯拉\"},{\"id\":2,\"text\":\"是\"},{\"id\":3,\"text\":\"什么\"}],\"b\":[{\"id\":3,\"text\":\"What\"},{\"id\":2,\"text\":\"is\"},{\"id\":1,\"text\":\"Tesla\"}],\"c\":[{\"id\":3,\"text\":\"wɑt\"},{\"id\":2,\"text\":\"ɪz\"},{\"id\":1,\"text\":\"ˈtɛslə\"}]}。注意，数组是按照单词顺序排序，但id需要原文/译文/音标一一对应，比如原文中 特斯拉排第一，id是1，译文中Tesla 排第三，但他需要关联原文的特斯拉，所以他的id应为1。返回的内容不要加任何markdown格式化，如果无法翻译，直接返回-1";

    const body = {
      model: "gpt-4o-2024-11-20",
      messages: [
        {
          role: "system",
          content: professionalModel ? professional : simple
        },
        {
          role: "user",
          content: value || inputValue
        },
      ]
    }

    fetch(`${apiDomain}${API_PATH}`, { method: "POST", headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body)})
      .then(res => res.json())
      .then(res => {
        if (!inputValue && !value) {
          return;
        }

        const text = res.choices[0].message.content;
        if (professionalModel) {
          if (text === "-1") {
            message.warning("当前无法翻译，请重试")
          } else {
            setResultJSON(JSON.parse(text));
          }
          return;
        }

        setResult(text);
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

  return (
    <div>
      <div style={{maxWidth: 600, margin: "auto"}}>
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
            style={{paddingTop: 50}}
            variant="borderless"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="这是一个带音标标注的翻译工具，点击开始翻译吧"
            autoSize={{
              minRows: 1,
              maxRows: 5,
            }}
          />
          <Divider orientation="right"/>
          {!professionalModel && <SimpleComponent result={result} loading={loading}/>}
          {professionalModel && <ProfessionalComponent resultJSON={resultJSON} loading={loading}/>}
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{minHeight: 80}}></div>
          <PhoneticSymbols/>
        </div>
      </div>
    </div>
  );
}

const Header = () => {
  return (
    <>
      <Typography.Title level={2} style={{ marginBottom: 0 }}>Translation Assistant</Typography.Title>
      <Typography.Text type={"secondary"}>Created by&nbsp;
        <Typography.Link
          target={"_blank"}
          href={"https://github.com/HttpStatusOK"}
          underline
          italic
          style={{ color: "#898989" }}
        >
          Edison
        </Typography.Link>.&nbsp;
      </Typography.Text>
      <Typography.Text type={"secondary"}>View&nbsp;
        <Typography.Link
          target={"_blank"}
          href={"https://github.com/HttpStatusOK/translation-assistant"}
          underline
          italic
          style={{ color: "#898989" }}
        >
          source code
        </Typography.Link>.
      </Typography.Text>
    </>
  )
}

const SimpleComponent = ({ result, loading }) => {
  return (
    <Spin spinning={loading}>
      <TextArea
        readOnly
        variant="borderless"
        value={`${result || ""}`}
        autoSize={{}}
        placeholder={`This is a translation tool with phonetic transcription; click to start translating.\n/ðɪs ɪz ə ˈtrænsleɪʃən tuːl wɪð fəˈnɛtɪk ˈtrænskrɪpʃən; klɪk tə stɑːt ˈtrænzˌleɪtɪŋ/`}
      />
    </Spin>
  )
}

const ProfessionalComponent = ({resultJSON, loading}) => {
  const [highLightId, setHighLightId] = useState(null);

  return (
    <div style={{ textAlign: "left", padding: "4px 11px"}}>
      {loading && <Skeleton active />}

      {!loading &&
        <>
          {resultJSON && resultJSON.a.map(item => (
            <Typography.Text
              style={highLightId === item.id && { color: "red" }}
              key={item.id} // 确保有唯一的key
              mark={highLightId === item.id} // 此处比较以确定是否显示标记
              onMouseEnter={() => setHighLightId(item.id)} // 设置高亮ID
              onMouseLeave={() => setHighLightId(null)} // 清空高亮ID
            >
              {item.text}&nbsp;
            </Typography.Text>
          ))}
          <br/>
          {resultJSON && resultJSON.b.map(item => (
            <Typography.Text
              style={highLightId === item.id && { color: "red" }}
              key={item.id} // 确保有唯一的key
              mark={highLightId === item.id} // 此处比较以确定是否显示标记
              onMouseEnter={() => setHighLightId(item.id)} // 设置高亮ID
              onMouseLeave={() => setHighLightId(null)} // 清空高亮ID
            >
              {item.text}&nbsp;
            </Typography.Text>
          ))}
          <br/>
          {resultJSON && resultJSON.c.map(item => (
            <Typography.Text
              style={highLightId === item.id && { color: "red" }}
              key={item.id} // 确保有唯一的key
              mark={highLightId === item.id} // 此处比较以确定是否显示标记
              onMouseEnter={() => setHighLightId(item.id)} // 设置高亮ID
              onMouseLeave={() => setHighLightId(null)} // 清空高亮ID
            >
              {item.text}&nbsp;
            </Typography.Text>
          ))}
        </>}
    </div>
  );
};

const PhoneticSymbols = () => {
  return (
    <>
      <Space size={60} align={"start"}>

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
          <Typography.Text strong>辅音音标</Typography.Text>
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
