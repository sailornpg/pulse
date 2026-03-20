pipeline {
  agent any

  environment {
    FRONTEND_DIR = 'frontend'
    BACKEND_DIR = 'backend'
    DEPLOY_ROOT = '/srv/pulse'
    VITE_API_URL = 'http://api.sailornpg.site'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build Frontend') {
      steps {
        dir("${FRONTEND_DIR}") {
          sh 'npm ci'
          sh 'VITE_API_URL=$VITE_API_URL npm run build'
        }
      }
    }

    stage('Check Backend') {
      steps {
        dir("${BACKEND_DIR}") {
          sh 'npm ci'
          sh 'npx tsc --noEmit -p tsconfig.json'
        }
      }
    }

    stage('Deploy Frontend') {
      steps {
        sh '''
          rm -rf ${DEPLOY_ROOT}/frontend/current/*
          cp -r ${WORKSPACE}/frontend/dist/* ${DEPLOY_ROOT}/frontend/current/
        '''
      }
    }

    stage('Deploy Backend') {
      steps {
        sh '''
          rm -rf ${DEPLOY_ROOT}/backend/current
          mkdir -p ${DEPLOY_ROOT}/backend/current
          cp -r ${WORKSPACE}/* ${DEPLOY_ROOT}/backend/current/
          cd ${DEPLOY_ROOT}/backend/current
          docker compose -f docker-compose.prod.yml up -d --build
        '''
      }
    }

    stage('Health Check') {
      steps {
        sh 'curl -f http://127.0.0.1:3001 || exit 1'
      }
    }
  }

  tools {
  nodejs 'node18'
}
}