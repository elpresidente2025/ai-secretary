// frontend/src/pages/TermsOfService.jsx
import React from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="md">
        <Box sx={{ mb: 3 }}>
          <Button 
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
            sx={{ mb: 2 }}
          >
            뒤로가기
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, color: '#152484' }}>
            AI비서관 이용약관
          </Typography>
          <Typography variant="body2" color="text.secondary">
            최종 개정일: 2025년 8월 25일
          </Typography>
        </Box>

        <Paper sx={{ p: 4 }}>
          <Typography paragraph sx={{ mb: 3 }}>
            본 이용약관은 AI비서관(이하 "회사")이 제공하는 정치인 전용 블로그 콘텐츠 생성 서비스(이하 "서비스")를 이용함에 있어 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: '#152484' }}>
            제1조 (목적)
          </Typography>
          <Typography paragraph>
            이 약관은 회사가 제공하는 AI 콘텐츠 생성 서비스의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 이용조건 및 절차 등 기본적인 사항을 규정합니다.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: '#152484' }}>
            제2조 (정의)
          </Typography>
          <Typography paragraph>
            1. "서비스"란 회사가 제공하는 블로그 원고 초안 자동 생성 및 관련 지원 서비스를 말합니다.
          </Typography>
          <Typography paragraph>
            2. "이용자"란 본 약관에 동의하고 회사의 서비스를 이용하는 개인 또는 단체를 말합니다.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: '#152484' }}>
            제3조 (약관의 효력 및 변경)
          </Typography>
          <Typography paragraph>
            1. 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력을 발생합니다.
          </Typography>
          <Typography paragraph>
            2. 회사는 필요한 경우 관련 법령을 위반하지 않는 범위에서 이 약관을 변경할 수 있습니다.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: '#152484' }}>
            제4조 (이용계약의 성립)
          </Typography>
          <Typography paragraph>
            1. 이용계약은 이용자가 약관의 내용에 동의하고 서비스 이용을 신청한 후, 회사가 이를 승낙함으로써 성립합니다.
          </Typography>
          <Typography paragraph>
            2. 회사는 다음 각 호에 해당하는 신청에 대하여는 승낙을 하지 않을 수 있습니다:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="1. 타인의 명의를 도용한 경우" />
            </ListItem>
            <ListItem>
              <ListItemText primary="2. 허위 정보를 기재한 경우" />
            </ListItem>
            <ListItem>
              <ListItemText primary="3. 기타 회사의 정책상 부적절하다고 판단되는 경우" />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: '#152484' }}>
            제5조 (개인정보 수집 및 이용)
          </Typography>
          <Typography paragraph>
            회사는 서비스 제공을 위해 필요한 개인정보를 수집하고 이를 안전하게 보호하기 위해 노력합니다. 자세한 내용은 개인정보처리방침을 참조하시기 바랍니다.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: '#152484' }}>
            제6조 (개인정보의 국외이전)
          </Typography>
          <Typography paragraph>
            1. 회사는 서비스 제공을 위하여 아래와 같이 개인정보를 국외에 이전합니다.
          </Typography>
          <Typography paragraph>
            2. 이전받는 자: Google LLC (Firebase, Gemini API)
          </Typography>
          <Typography paragraph>
            3. 이전 국가: 미국
          </Typography>
          <Typography paragraph>
            4. 이전 시점 및 방법: 서비스 이용 시점에 네트워크를 통해 수시로 전송
          </Typography>
          <Typography paragraph>
            5. 이전 목적: 데이터 저장, 서비스 운영 및 안정성 확보
          </Typography>
          <Typography paragraph>
            6. 보유 및 이용기간: 이용자의 서비스 탈퇴 또는 동의 철회 시까지
          </Typography>
          <Typography paragraph>
            7. 이용자는 본 약관에 동의함으로써 개인정보의 국외 이전에 동의한 것으로 간주합니다. 단, 동의를 거부할 권리가 있으며, 이 경우 서비스 이용에 제한이 있을 수 있습니다.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: '#152484' }}>
            제7조 (서비스의 제공 및 변경)
          </Typography>
          <Typography paragraph>
            1. 회사는 이용자에게 계약한 플랜에 따라 정기적으로 콘텐츠 초안을 제공합니다.
          </Typography>
          <Typography paragraph>
            2. 제공되는 콘텐츠는 원고 초안이며, 이용자가 최종 검토 및 수정을 거쳐 사용하는 것을 원칙으로 합니다.
          </Typography>
          <Typography paragraph>
            3. 회사는 서비스 개선을 위해 콘텐츠의 형식이나 제공 방식을 변경할 수 있으며, 요금, 제공 횟수, 서비스 범위 등 이용자의 권리에 중대한 영향을 미치는 변경사항은 사전에 고지합니다.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: '#152484' }}>
            제8조 (이용자의 의무)
          </Typography>
          <Typography paragraph>
            1. 이용자는 콘텐츠를 법령 및 공공질서에 반하는 목적으로 사용해서는 안 됩니다.
          </Typography>
          <Typography paragraph>
            2. 이용자는 회사가 제공한 콘텐츠를 자신의 책임 하에 활용해야 하며, 콘텐츠 사용으로 인해 발생하는 법적 책임은 전적으로 이용자에게 있습니다.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: '#152484' }}>
            제9조 (지적재산권)
          </Typography>
          <Typography paragraph>
            1. 서비스에서 제공되는 모든 콘텐츠에 대한 저작권은 회사 또는 정당한 권리자로부터 이용 허락을 받은 자에게 있으며, 이용자는 이를 무단으로 복제, 배포, 전송, 출판할 수 없습니다.
          </Typography>
          <Typography paragraph>
            2. 단, 이용자는 제공된 콘텐츠를 본인의 블로그, SNS 등 정치 홍보 목적에 한해 자유롭게 사용할 수 있습니다.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: '#152484' }}>
            제10조 (환불 규정)
          </Typography>
          <Typography paragraph>
            1. 이용자는 콘텐츠 제공이 개시되기 전에는 서비스 결제일로부터 7일 이내에 청약을 철회하고 전액 환불을 요청할 수 있습니다.
          </Typography>
          <Typography paragraph>
            2. 콘텐츠가 일부라도 제공된 이후에는, 이용자가 요청한 경우 잔여 이용 기간에 대해 일할 계산한 금액을 기준으로 환불합니다. 단, 1회성 콘텐츠 제공이 완료된 경우 해당 회차에 대해서는 환불이 불가합니다.
          </Typography>
          <Typography paragraph>
            3. 회사는 환불 요청을 받은 날로부터 7영업일 이내에 환불을 완료하며, 환불은 카드 결제 취소를 통해 처리됩니다. 결제사 정책에 따라 실제 환급일은 상이할 수 있습니다.
          </Typography>
          <Typography paragraph>
            4. 무료 또는 프로모션 제공 콘텐츠에 대해서는 환불이 적용되지 않습니다.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: '#152484' }}>
            제11조 (계약의 해지)
          </Typography>
          <Typography paragraph>
            1. 이용자는 언제든지 계약을 해지할 수 있으며, 회사는 환불 규정에 따라 잔여 기간에 해당하는 금액을 정산합니다.
          </Typography>
          <Typography paragraph>
            2. 회사는 이용자가 본 약관을 위반한 경우 사전 통지 없이 계약을 해지할 수 있습니다.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: '#152484' }}>
            제12조 (이중당적자의 이용 제한)
          </Typography>
          <Typography paragraph>
            1. 이용자가 이중당적 상태임이 확인될 경우, 회사는 서비스 이용계약을 해지하고 관련 사실을 관계기관에 통보할 수 있습니다.
          </Typography>
          <Typography paragraph>
            2. 이중당적 사실로 인해 발생한 모든 불이익은 이용자 본인의 책임이며, 회사는 이에 대해 일절 책임지지 않습니다.
          </Typography>
          <Typography paragraph>
            3. 이용자는 서비스 신청 시 자신이 단일 정당에만 소속되어 있음을 확인하며, 이중당적 여부가 변경될 경우 즉시 회사에 고지해야 합니다.
          </Typography>
          <Typography paragraph>
            4. 회사는 이용자가 본 약관에 따른 고지의무를 위반한 것으로 합리적으로 판단되는 정황이 확인된 경우, 해당 이용자에게 소명 기회를 부여할 수 있으며, 소명이 없거나 허위인 경우 계약을 해지할 수 있습니다. 이때 확인된 정황에는 이용자가 공개적으로 운영하는 블로그, SNS 등에서 확인된 정치 활동 내용이 포함될 수 있습니다.
          </Typography>
          <Typography paragraph>
            5. 제4항에 따른 소명 기한은 회사가 별도로 지정하며, 3영업일 이내로 제공합니다. 이용자가 해당 기한 내 소명을 제출하지 않을 경우, 회사는 계약을 해지할 수 있습니다.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: '#152484' }}>
            제13조 (면책조항)
          </Typography>
          <Typography paragraph>
            1. 회사는 AI가 생성한 콘텐츠의 정확성, 완전성, 적법성에 대해 보장하지 않으며, 이용자가 해당 콘텐츠를 사용하는 과정에서 발생한 문제에 대해 책임지지 않습니다.
          </Typography>
          <Typography paragraph>
            2. 회사는 천재지변, 기술적 장애 등 불가항력적인 사유로 인한 서비스 제공 중단에 대해 책임을 지지 않습니다.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: '#152484' }}>
            제14조 (준거법 및 관할)
          </Typography>
          <Typography paragraph>
            1. 본 약관은 대한민국 법률에 따라 해석됩니다.
          </Typography>
          <Typography paragraph>
            2. 서비스 이용과 관련하여 회사와 이용자 간에 발생한 분쟁에 대해서는 인천지방법원 부천지원 또는 인천지방법원 북부지원(완공, 개원 후)을 1심 관할법원으로 합니다.
          </Typography>

          <Box sx={{ mt: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#152484' }}>
              부칙
            </Typography>
            <Typography variant="body2" color="text.secondary">
              이 약관은 2025년 8월 25일부터 시행됩니다.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default TermsOfService;